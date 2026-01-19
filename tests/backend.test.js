// tests/backend.test.js
const request = require("supertest");
const app = require("../index"); // your Express app

describe("POST /track", () => {
  it("should save a valid event and return 200", async () => {
    const event = {
      event_type: "pageview",
      page_url: "http://example.com",
      anonymous_id: "test-visitor",
      timestamp: new Date().toISOString(),
    };

    const res = await request(app)
      .post("/track")
      .send(event)
      .set("Accept", "application/json");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should reject invalid event data", async () => {
    const invalidEvent = {
      page_url: "http://example.com",
    };

    const res = await request(app)
      .post("/track")
      .send(invalidEvent)
      .set("Accept", "application/json");

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid event data");
  });
});
