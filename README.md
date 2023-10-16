# ctfd-load-test

Before hosting an event with [CTFd](https://ctfd.io/), it's good to know the performance you can expect from your setup. This repo includes basic [k6 load tests](https://k6.io/docs/) to make sure nothing topples over under high load.

Load tests:

- Create user
- Submit challenge

## Getting Started

### Install k6

From the [k6.io docs](https://k6.io/docs/get-started/installation/):

```bash
sudo dnf install https://dl.k6.io/rpm/repo.rpm
sudo dnf install k6
```

## Run Tests

```bash
k6 run -e CTFD_URL=https://example.com create_user.js
k6 run -e CTFD_URL=https://example.com submit_challenge.js
```
