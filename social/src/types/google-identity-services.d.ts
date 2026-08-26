interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleButtonConfiguration {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'small' | 'medium' | 'large';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
  logo_alignment?: 'left' | 'center';
}

interface GoogleIdentityConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  ux_mode?: 'popup' | 'redirect';
  use_fedcm_for_prompt?: boolean;
}

interface GoogleIdentityApi {
  initialize: (configuration: GoogleIdentityConfiguration) => void;
  renderButton: (parent: HTMLElement, configuration: GoogleButtonConfiguration) => void;
  cancel: () => void;
}

interface GoogleIdentityServices {
  accounts: {
    id: GoogleIdentityApi;
  };
}

interface Window {
  google?: GoogleIdentityServices;
}
