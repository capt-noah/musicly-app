import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';

export default function UnmatchedRoute() {
  // Widgets often open deep links like `musicly://` or `musicly://widget` which don't map to a specific screen
  // We simply catch all unmatched routes and redirect to the home screen.
  return <Redirect href="/" />;
}
