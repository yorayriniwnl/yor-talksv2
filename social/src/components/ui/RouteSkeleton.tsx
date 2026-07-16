import React from 'react';

export default function RouteSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading content" style={{padding: 24}}>
      <div style={{maxWidth: 900, margin: '0 auto'}}>
        <div style={{height: 20, width: '40%', background: 'rgba(0,0,0,0.06)', marginBottom: 12, borderRadius: 4}} />
        <div style={{height: 400, background: 'linear-gradient(90deg, rgba(0,0,0,0.03), rgba(0,0,0,0.06))', borderRadius: 8}} />
      </div>
    </div>
  );
}
