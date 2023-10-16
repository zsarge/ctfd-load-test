import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import http from "k6/http";
import { sleep, check } from "k6";
import exec from "k6/execution";
import { parseHTML } from "k6/html";

const VU_COUNT = 1;
const REQUESTS_PER_VU = 1;
const CHALLENGE_ID = 225;
const WRONG_ANSWER = "b";
const CORRECT_ANSWER = "a";

function generateRandomString(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const randomName = generateRandomString(6);
const user = {
  username: randomName,
  password: randomName,
  email: `${randomName}@example.com`,
};

export const options = {
  vus: VU_COUNT, // all VUs will share the same user account
  iterations: VU_COUNT * REQUESTS_PER_VU, // each user makes N requests
};

// set with `k6 run -e CTFD_URL=https://example.com submit_challenges.js `
const domain = __ENV.CTFD_URL;

function createUser(options) {
  let res = http.get(`${domain}/register`);
  return res.submitForm({
    formSelector: "form",
    fields: {
      name: options.username,
      password: options.password,
      email: options.email,
    },
  });
}

// setup only called once per test
export function setup() {
  console.log("creating", user.username);
  const res = createUser(user);
  check(res, {
    "accounts created successfully": (r) => r.status === 200,
  });
  const sessionCookie = res.request.cookies.session[0].value;
  const csrfNonceRegex = /'csrfNonce': "(.{64})"/;
  const csrfNonce = res.body.match(csrfNonceRegex)[1]; // select first group in match
  console.log({ sessionCookie, csrfNonce });

  sleep(1);
  return { sessionCookie, csrfNonce };
}

export default function (sessionInfo) {
  const postResponse = http.post(
    `${domain}/api/v1/challenges/attempt`,
    JSON.stringify({
      challenge_id: CHALLENGE_ID,
      submission: WRONG_ANSWER,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Csrf-Token": sessionInfo.csrfNonce,
      },
      cookies: {
        session: sessionInfo.sessionCookie,
      },
    }
  );
  check(postResponse, {
    "api returned 200": (r) => r.status === 200,
    "submission was successfully processed": (r) => r.json().success === true,
    "submission was incorrect": (r) => r.json().data.status === "incorrect",
  });
}

// from https://github.com/benc-uk/k6-reporter#multiple-outputs
export function handleSummary(data) {
  return {
    "submit_challenges_results.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
