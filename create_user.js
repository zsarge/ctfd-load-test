/**
 * Make sure that the server can handle 2 registrations per second for 1 minute
 */

import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import http from "k6/http";
import { sleep, check } from "k6";
import exec from "k6/execution";

// set with `k6 run -e CTFD_URL=https://example.com create_user.js `
const domain = __ENV.CTFD_URL;

export const options = {
  scenarios: {
    constant_request_rate: {
      executor: "constant-arrival-rate",
      rate: 2,
      timeUnit: "1s",
      duration: "1m",
      preAllocatedVUs: 20,
      maxVUs: 20,
    },
  },
};

function getName() {
  const executionId = exec.scenario.iterationInTest;
  const timestamp = new Date().toISOString();
  const time = timestamp.substring("YYYY-MM-DDT".length);
  return time + "_" + executionId;
}

export default function () {
  // request registration page
  let res = http.get(`${domain}/register`);

  // Now, submit form setting/overriding some fields of the form
  const username = getName();
  res = res.submitForm({
    formSelector: "form",
    fields: {
      name: username,
      password: username,
      email: `${username}@example.com`,
    },
  });
  check(res, { "returned a 200": (r) => r.status === 200 });
  sleep(1);
}

// from https://github.com/benc-uk/k6-reporter#multiple-outputs
export function handleSummary(data) {
  return {
    "create_user_results.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
