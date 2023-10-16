import http from "k6/http";
import { sleep, check } from "k6";
import exec from "k6/execution";

const dotenv = require("dotenv");
dotenv.config();

const domain = process.env.CTFD_URL;

export default function () {
  // request login page
  let res = http.get(`${domain}/register`);

  const executionId = exec.scenario.iterationInTest;
  // Now, submit form setting/overriding some fields of the form
  res = res.submitForm({
    formSelector: "form",
    fields: {
      name: executionId.toString(),
      password: executionId.toString(),
      email: `${executionId}@example.com`,
    },
  });
  check(res, { "returned a 200": (r) => r.status === 200 });
  sleep(1);
}
