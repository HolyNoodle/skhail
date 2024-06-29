import { SkhailError, getError } from "@skhail/core";

export async function faultProofRetry<T>(
  action: string,
  fn: (attempt: number) => Promise<T>,
  errorCb: (err: SkhailError, attempt: number) => void,
  retryTime: number = 5,
  maxAttempt: number = 120
): Promise<T> {
  const faultProofTry = async (attempt: number) => {
    try {
      const result = await fn(attempt);

      return result;
    } catch (err) {
      const error = getError(err, undefined, {
        name: "unexpected",
        message: "Unexpected error while " + action,
      });

      errorCb(error, attempt);

      if (attempt === maxAttempt) {
        throw new SkhailError({
          name: "unexpected",
          message: `Max attempts reached while ${action}`,
        });
      }

      return new Promise<T>((resolve, reject) => {
        setTimeout(
          () =>
            faultProofTry(attempt + 1)
              .then(resolve)
              .catch((e) => reject(e)),
          retryTime * 1000
        );
      });
    }
  };

  return faultProofTry(1);
}
