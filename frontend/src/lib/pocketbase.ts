import PocketBase from "pocketbase";

const pb = new PocketBase(
  import.meta.env.VITE_POCKETBASE_URL || "http://localhost:8090"
);

// Enable auto cancellation of pending requests
pb.autoCancellation(false);

// Before every request, check if the stored token has expired.
// If so, clear it immediately so the request goes out unauthenticated
// and the authStore.onChange listeners (AuthProvider) log the user out.
pb.beforeSend = (url, options) => {
  if (pb.authStore.token && !pb.authStore.isValid) {
    pb.authStore.clear();
  }
  return { url, options };
};

export default pb;
