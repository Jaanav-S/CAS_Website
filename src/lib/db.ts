import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Mongoose connections are cached on the global object so that Next.js hot
 * reloads (and serverless invocations) reuse a single pool instead of opening
 * a new connection for every module reload.
 */
type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = globalThis as typeof globalThis & {
  _mongoose?: Cached;
};

const cached: Cached = globalWithMongoose._mongoose ?? {
  conn: null,
  promise: null,
};
globalWithMongoose._mongoose = cached;

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and add your MongoDB Atlas connection string.",
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

/**
 * Compiles a Mongoose model, reusing the cached one in production.
 *
 * In development the cached model is thrown away first. Mongoose keeps
 * compiled models on its singleton, and Next.js hot-reloads modules without
 * restarting the process — so editing a schema (adding a role to an enum, say)
 * would otherwise leave the *old* schema validating requests until the server
 * was restarted, with a confusing "not a valid enum value" error.
 */
export function registerModel<T>(
  name: string,
  schema: mongoose.Schema<T>,
): mongoose.Model<T> {
  if (process.env.NODE_ENV !== "production" && mongoose.models[name]) {
    mongoose.deleteModel(name);
  }
  return (
    (mongoose.models[name] as mongoose.Model<T>) ??
    mongoose.model<T>(name, schema)
  );
}
