import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import http from "k6/http";
import { sleep, check } from "k6";

const VU_COUNT = 10;
const REQUESTS_PER_VU = 10;
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
  //   iterations: VU_COUNT * REQUESTS_PER_VU, // each user makes N requests
  scenarios: {
    contacts: {
      executor: "constant-arrival-rate",
      // How long the test lasts
      duration: "1m",
      // How many iterations per timeUnit
      rate: 20,
      // Start `rate` iterations per second
      timeUnit: "1s",
      // Pre-allocate VUs
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
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
  // WARNING: parsing HTML with regex is not a good idea...
  // but the text we want is in the JavaScript which isn't accessible via CSS selectors
  const csrfNonceRegex = /'csrfNonce': "(.{64})"/;
  const csrfNonce = res.body.match(csrfNonceRegex)[1]; // select first group in match
  return { sessionCookie, csrfNonce };
}

export default function (sessionInfo) {
  const postResponse = http.post(
    `${domain}/api/v1/challenges/attempt`,
    JSON.stringify({
      challenge_id: CHALLENGE_ID,
      submission: CORRECT_ANSWER,
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
    "submission was expected": (r) => {
      if (JSON.parse(r.request.body).submission === CORRECT_ANSWER) {
        const status = r.json().data.status;
        return status === "correct" || status === "already_solved";
      } else {
        return r.json().data.status === "incorrect";
      }
    },
  });
}

// from https://github.com/benc-uk/k6-reporter#multiple-outputs
export function handleSummary(data) {
  return {
    "submit_challenges_results.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
