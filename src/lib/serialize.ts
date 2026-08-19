/**
 * Mongo documents contain ObjectIds and Dates that cannot cross the
 * server/client component boundary. This flattens them to plain JSON.
 */
export function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
