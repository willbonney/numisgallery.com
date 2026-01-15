import PocketBase from 'pocketbase';

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090');

// Enable auto cancellation of pending requests
pb.autoCancellation(false);

export default pb;

