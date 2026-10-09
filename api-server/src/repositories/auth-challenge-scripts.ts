// Authentication state is deliberately validated in Lua as well as in the
// service: a legacy/corrupt Redis value must never become login authority.
export const authChallengeLua = `
local function integer(value, minimum, maximum)
  return type(value) == 'number' and value == math.floor(value) and value >= minimum and value <= maximum
end
local function nonempty(value)
  return type(value) == 'string' and string.len(value) > 0
end
local function decode(raw)
  if not raw then return nil end
  local ok, state = pcall(cjson.decode, raw)
  if not ok or type(state) ~= 'table' then return nil end
  return state
end
local function now_ms()
  local clock = redis.call('TIME')
  return tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
end
local function otp_valid(state)
  return state and state.schemaVersion == 1 and nonempty(state.challengeId)
    and nonempty(state.userId) and nonempty(state.email) and state.email == string.lower(state.email)
    and type(state.codeHash) == 'string' and string.len(state.codeHash) == 64
    and not string.find(state.codeHash, '[^a-f0-9]')
    and integer(state.authVersion, 0, 2147483647) and integer(state.attempts, 0, 5)
    and integer(state.expiresAt, 1, 9007199254740991)
    and (state.status == 'issued' or (state.status == 'approval' and nonempty(state.approvalChallengeId)))
end
local function approval_valid(state)
  return state and state.schemaVersion == 1 and nonempty(state.challengeId) and nonempty(state.userId)
    and integer(state.authVersion, 0, 2147483647) and integer(state.attempts, 0, 5)
    and integer(state.matchingNumber, 1, 99) and integer(state.expiresAtMs, 1, 9007199254740991)
    and nonempty(state.expiresAt) and nonempty(state.createdAt)
    and (state.status == 'pending' or state.status == 'approved')
    and (state.emailOtpKey == nil or (nonempty(state.emailOtpKey) and nonempty(state.emailOtpChallengeId)))
end
`;

export const redeemEmailOtpLua = `${authChallengeLua}
local raw = redis.call('GET', KEYS[1])
local state = decode(raw)
if not otp_valid(state) or state.challengeId ~= ARGV[1] or state.userId ~= ARGV[2]
  or state.email ~= ARGV[3] or state.authVersion ~= tonumber(ARGV[4])
  or state.expiresAt <= now_ms() or state.attempts >= 5 then return false end
if state.codeHash ~= ARGV[5] then
  state.attempts = state.attempts + 1
  redis.call('SET', KEYS[1], cjson.encode(state), 'KEEPTTL')
  return false
end
if ARGV[6] == 'attempt' then return false end
if state.status == 'approval' then
  local approvalKey = ARGV[8] .. state.approvalChallengeId
  local approvalRaw = redis.call('GET', approvalKey)
  local approval = decode(approvalRaw)
  if not approval_valid(approval) or approval.challengeId ~= state.approvalChallengeId
    or approval.emailOtpKey ~= KEYS[1] or approval.emailOtpChallengeId ~= state.challengeId
    or approval.userId ~= state.userId or approval.authVersion ~= state.authVersion
    or approval.expiresAtMs ~= state.expiresAt or approval.expiresAtMs <= now_ms()
    or approval.attempts >= 5 then return false end
  if ARGV[6] == 'approval' then return approvalRaw end
  redis.call('DEL', approvalKey)
  redis.call('SREM', KEYS[3], approval.challengeId)
else
  if ARGV[6] == 'approval' then
    local approval = decode(ARGV[7])
    if not approval_valid(approval) or approval.userId ~= state.userId or approval.authVersion ~= state.authVersion
      or approval.emailOtpKey ~= KEYS[1] or approval.emailOtpChallengeId ~= state.challengeId
      or approval.expiresAtMs ~= state.expiresAt or redis.call('EXISTS', KEYS[2]) == 1 then return false end
    redis.call('SET', KEYS[2], ARGV[7], 'PXAT', state.expiresAt)
    redis.call('SADD', KEYS[3], approval.challengeId)
    state.status = 'approval'
    state.approvalChallengeId = approval.challengeId
    redis.call('SET', KEYS[1], cjson.encode(state), 'KEEPTTL')
    return ARGV[7]
  end
end
redis.call('DEL', KEYS[1])
return raw
`;

export const consumeLoginApprovalLua = `${authChallengeLua}
local raw = redis.call('GET', KEYS[1])
local state = decode(raw)
if not approval_valid(state) or state.challengeId ~= ARGV[1] or state.userId ~= ARGV[2] or state.status ~= 'approved'
  or state.expiresAtMs <= now_ms() or state.attempts >= 5 then return false end
if state.emailOtpKey then
  if state.emailOtpKey ~= KEYS[3] then return false end
  local otp = decode(redis.call('GET', KEYS[3]))
  if not otp_valid(otp) or otp.challengeId ~= state.emailOtpChallengeId
    or otp.approvalChallengeId ~= state.challengeId or otp.status ~= 'approval'
    or otp.userId ~= state.userId or otp.authVersion ~= state.authVersion
    or otp.expiresAt ~= state.expiresAtMs or otp.expiresAt <= now_ms() or otp.attempts >= 5 then return false end
  redis.call('DEL', KEYS[3])
end
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], state.challengeId)
return raw
`;

export const approveLoginChallengeLua = `${authChallengeLua}
local state = decode(redis.call('GET', KEYS[1]))
if not approval_valid(state) or state.challengeId ~= ARGV[1] or state.userId ~= ARGV[2]
  or state.authVersion ~= tonumber(ARGV[3]) or state.status ~= 'pending'
  or state.expiresAtMs <= now_ms() or state.attempts >= 5 then return 0 end
if state.matchingNumber ~= tonumber(ARGV[4]) then
  state.attempts = state.attempts + 1
  redis.call('SET', KEYS[1], cjson.encode(state), 'KEEPTTL')
  return 0
end
state.status = 'approved'
state.approvedAt = ARGV[5]
redis.call('SET', KEYS[1], cjson.encode(state), 'KEEPTTL')
return 1
`;
