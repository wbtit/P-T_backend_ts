import Redlock from "redlock";
import redis from "../redis/redisClient";

const redlock = new Redlock(
  [redis as any],
  {
    // The expected clock drift; for more details see http://redis.io/topics/distlock
    driftFactor: 0.01, // time in ms

    // The max number of times Redlock will attempt to lock a resource
    // before erroring (0 means retry 0 times - skip if locked)
    retryCount: 0,

    // the time in ms between attempts
    retryDelay: 200, // time in ms

    // the max time in ms randomly added to retries
    // to improve performance under high contention
    retryJitter: 200, // time in ms

    // The minimum remaining time on a lock before an extension is automatically
    // attempted with the automaticExtensionThreshold parameter
    automaticExtensionThreshold: 500, // time in ms
  }
);

export default redlock;
