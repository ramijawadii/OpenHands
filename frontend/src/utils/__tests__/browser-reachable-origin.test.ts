import { describe, it, expect, afterEach } from "vitest";
import { browserReachableOrigin } from "../browser-reachable-origin";

/** jsdom's location is not writable; replacing the whole object is. */
function servedFrom(href: string) {
  Object.defineProperty(window, "location", {
    value: new URL(href),
    writable: true,
    configurable: true,
  });
}

const ORIGINAL = window.location;

afterEach(() => {
  Object.defineProperty(window, "location", {
    value: ORIGINAL,
    writable: true,
    configurable: true,
  });
});

describe("browserReachableOrigin", () => {
  it("swaps a loopback host for the host the page came from, keeping the port", () => {
    servedFrom("http://192.168.1.234:3000/conversations/abc");
    expect(browserReachableOrigin("http://localhost:8085")).toBe(
      "http://192.168.1.234:8085",
    );
    expect(browserReachableOrigin("http://127.0.0.1:3080")).toBe(
      "http://192.168.1.234:3080",
    );
  });

  it("leaves the value alone when the page itself is on loopback", () => {
    servedFrom("http://localhost:3000/");
    expect(browserReachableOrigin("http://127.0.0.1:3080")).toBe(
      "http://127.0.0.1:3080",
    );
  });

  it("never rewrites a real hostname — that is a deployment decision", () => {
    servedFrom("http://192.168.1.234:3000/");
    expect(browserReachableOrigin("https://docs.example.com")).toBe(
      "https://docs.example.com",
    );
  });

  it("passes through empty and relative values untouched", () => {
    servedFrom("http://192.168.1.234:3000/");
    expect(browserReachableOrigin("")).toBe("");
    expect(browserReachableOrigin("/onlyoffice")).toBe("/onlyoffice");
  });
});
