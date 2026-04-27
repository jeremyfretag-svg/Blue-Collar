# Load Testing Infrastructure Guide

This guide covers setting up load testing with k6 to ensure application scalability and identify performance bottlenecks.

## Architecture

```
Load Test Scenarios (k6)
      ↓
  API Endpoints
      ↓
  Performance Metrics
      ↓
  Results Analysis
```

## 1. k6 Installation

### 1.1 Local Installation

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Docker
docker run -i grafana/k6 run - < script.js
```

### 1.2 Add to package.json

```json
{
  "devDependencies": {
    "k6": "^0.47.0"
  }
}
```

## 2. Load Testing Scenarios

### 2.1 Basic API Load Test

Create `deploy/load-tests/basic-load-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

export default function () {
  // Test worker listing
  let res = http.get(`${BASE_URL}/workers`);
  check(res, {
    'GET /workers status is 200': (r) => r.status === 200,
    'GET /workers response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test category listing
  res = http.get(`${BASE_URL}/categories`);
  check(res, {
    'GET /categories status is 200': (r) => r.status === 200,
    'GET /categories response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### 2.2 Authentication Load Test

Create `deploy/load-tests/auth-load-test.js`:

```javascript
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
```

### 2.3 Worker CRUD Load Test

Create `deploy/load-tests/worker-crud-load-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 30 },
    { duration: '3m', target: 30 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';
const TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
  };

  // Create worker
  const createRes = http.post(
    `${BASE_URL}/workers`,
    JSON.stringify({
      name: `Worker ${Math.random()}`,
      category: 'plumber',
      location: 'New York',
      bio: 'Experienced plumber',
    }),
    { headers }
  );

  check(createRes, {
    'Create worker status is 201': (r) => r.status === 201,
  });

  if (createRes.status === 201) {
    const workerId = createRes.json('id');

    sleep(1);

    // Get worker
    const getRes = http.get(`${BASE_URL}/workers/${workerId}`);
    check(getRes, {
      'Get worker status is 200': (r) => r.status === 200,
    });

    sleep(1);

    // Update worker
    const updateRes = http.post(
      `${BASE_URL}/workers/${workerId}`,
      JSON.stringify({
        bio: 'Updated bio',
      }),
      {
        headers: {
          ...headers,
          'X-HTTP-Method': 'PUT',
        },
      }
    );

    check(updateRes, {
      'Update worker status is 200': (r) => r.status === 200,
    });

    sleep(1);

    // Delete worker
    const deleteRes = http.del(`${BASE_URL}/workers/${workerId}`, { headers });
    check(deleteRes, {
      'Delete worker status is 204': (r) => r.status === 204,
    });
  }

  sleep(2);
}
```

### 2.4 Spike Test

Create `deploy/load-tests/spike-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '10s', target: 1000 }, // Spike
    { duration: '1m', target: 1000 },
    { duration: '10s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

export default function () {
  const res = http.get(`${BASE_URL}/workers`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
```

### 2.5 Stress Test

Create `deploy/load-tests/stress-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 200 },
    { duration: '5m', target: 300 },
    { duration: '5m', target: 400 },
    { duration: '5m', target: 500 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.2'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

export default function () {
  const res = http.get(`${BASE_URL}/workers`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(0.5);
}
```

## 3. Running Load Tests

### 3.1 Basic Load Test

```bash
k6 run deploy/load-tests/basic-load-test.js
```

### 3.2 With Custom Base URL

```bash
BASE_URL=https://api.example.com k6 run deploy/load-tests/basic-load-test.js
```

### 3.3 With Authentication Token

```bash
AUTH_TOKEN=your_jwt_token k6 run deploy/load-tests/worker-crud-load-test.js
```

### 3.4 Docker Execution

```bash
docker run -i grafana/k6 run - < deploy/load-tests/basic-load-test.js
```

## 4. Load Test Results Analysis

### 4.1 Key Metrics

- **Response Time (p95, p99)**: Percentile response times
- **Error Rate**: Percentage of failed requests
- **Throughput**: Requests per second
- **Virtual Users**: Concurrent users during test

### 4.2 Interpreting Results

```
✓ http_req_duration: p(95)<500ms ✓ 95% of requests completed in < 500ms
✓ http_req_failed: rate<0.1 ✓ Less than 10% of requests failed
✓ checks: 99.5% ✓ 99.5% of checks passed
```

### 4.3 Performance Bottlenecks

Common issues identified:
- High response times (> 1000ms)
- High error rates (> 5%)
- Memory leaks under load
- Database connection pool exhaustion
- CPU saturation

## 5. Continuous Load Testing

### 5.1 GitHub Actions Integration

Create `.github/workflows/load-test.yml`:

```yaml
name: Load Testing

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run load tests
        run: |
          docker run -i grafana/k6 run - < deploy/load-tests/basic-load-test.js \
            -e BASE_URL=${{ secrets.API_URL }}
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: results/
```

### 5.2 Docker Compose Integration

Add to `docker-compose.prod.example.yml`:

```yaml
load-tester:
  image: grafana/k6:latest
  restart: 'no'
  depends_on:
    - api
  environment:
    BASE_URL: http://api:3000/api
  volumes:
    - ./deploy/load-tests:/scripts:ro
  command: run /scripts/basic-load-test.js
  networks:
    - internal
```

## 6. Performance Optimization Recommendations

Based on load test results:

1. **Response Time > 500ms**
   - Add database indexes
   - Implement caching
   - Optimize queries

2. **Error Rate > 5%**
   - Check error logs
   - Increase timeout values
   - Scale API instances

3. **High Memory Usage**
   - Profile memory leaks
   - Reduce cache size
   - Optimize data structures

4. **CPU Saturation**
   - Add more CPU cores
   - Optimize algorithms
   - Implement load balancing

## 7. Load Testing Best Practices

- Run tests during off-peak hours
- Test against production-like environment
- Gradually increase load
- Monitor system resources during tests
- Document baseline performance
- Run tests regularly (weekly/monthly)
- Share results with team
- Use results to guide optimization efforts
