import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

export default function () {
  // Login
  const loginRes = http.post(`${BASE_URL}/auth/login`, {
    email: `user${Math.random()}@example.com`,
    password: 'password123',
  });

  check(loginRes, {
    'Login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);
}
