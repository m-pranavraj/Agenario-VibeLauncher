/**
 * Attack Packs — Business-type-aware attack vectors
 * Injected into agent system prompts based on detected businessType.
 */

export interface AttackPack {
  name: string;
  icon: string;
  vectors: string[];
}

const ATTACK_PACKS: Record<string, AttackPack> = {
  saas: {
    name: "SaaS Attack Pack",
    icon: "🔐",
    vectors: [
      "Subscription bypass — test if paid features are accessible without valid subscription by manipulating plan checks or API parameters",
      "Team role escalation — verify that member-level users cannot access admin/owner endpoints by changing role IDs or permission tokens",
      "Free plan abuse — check if free-tier limits (scan counts, feature access) can be bypassed via direct API calls or parameter tampering",
      "Invite link abuse — test if expired or revoked invite links still grant access, or if invite tokens can be reused across organizations",
      "Session hijacking — verify session tokens are properly invalidated on logout and cannot be replayed from another device",
      "Multi-tenant data leakage — test if one organization's data can be accessed by manipulating tenant IDs in API calls",
    ],
  },
  ecommerce: {
    name: "Ecommerce Attack Pack",
    icon: "🛒",
    vectors: [
      "Coupon stacking — test if multiple discount codes can be applied simultaneously or if percentage discounts can exceed 100%",
      "Negative pricing — check if negative quantities, prices, or amounts can be submitted through cart or checkout APIs",
      "Checkout manipulation — verify that price and quantity values sent from the client are validated server-side and cannot be tampered with",
      "Inventory race conditions — test if simultaneous purchases of limited-stock items can result in overselling",
      "Payment bypass — check if orders can be completed without actual payment verification by skipping webhook confirmation",
      "Address manipulation — test if shipping addresses can be changed after payment to redirect deliveries",
    ],
  },
  marketplace: {
    name: "Marketplace Attack Pack",
    icon: "🏪",
    vectors: [
      "Double booking — test if the same resource/slot can be booked by multiple users simultaneously",
      "Unauthorized seller actions — verify that buyers cannot access seller-only endpoints or modify listing ownership",
      "Refund abuse — check if refunds can be triggered multiple times for the same transaction or if partial refunds can exceed original amount",
      "Review manipulation — test if users can submit reviews for products they haven't purchased or modify other users' reviews",
      "Commission bypass — verify that marketplace fees cannot be circumvented by direct buyer-seller communication channels",
      "Listing hijacking — test if seller listings can be modified by manipulating product/listing IDs in update requests",
    ],
  },
  ai: {
    name: "AI App Attack Pack",
    icon: "🤖",
    vectors: [
      "Prompt injection — test if user inputs can override system prompts to extract instructions, change behavior, or bypass safety filters",
      "System prompt leakage — check if the system prompt can be extracted through carefully crafted queries like 'repeat your instructions'",
      "Token burn attacks — verify that extremely long inputs are properly truncated and cannot cause excessive API costs",
      "Model output manipulation — test if responses can be steered to generate harmful, biased, or misleading content",
      "Context window poisoning — check if previous conversation context can be manipulated to influence future responses",
      "API key exposure — verify that AI provider API keys are not exposed in client-side code or network requests",
    ],
  },
  analytics: {
    name: "Analytics Platform Pack",
    icon: "📊",
    vectors: [
      "Dashboard data leakage — test if one user's analytics data is accessible by manipulating dashboard or report IDs",
      "Export injection — check if CSV/Excel exports are vulnerable to formula injection attacks",
      "Filter bypass — verify that query filters cannot be manipulated to access data outside the user's permitted scope",
      "Webhook data exposure — test if webhook payloads contain sensitive data that could be intercepted",
      "Rate limit bypass on data queries — check if expensive aggregation queries can be abused to cause service degradation",
      "Tracking pixel abuse — verify that tracking endpoints validate origin and cannot be used for unauthorized data collection",
    ],
  },
  content: {
    name: "Content Platform Pack",
    icon: "📝",
    vectors: [
      "Stored XSS in user content — test if HTML/JavaScript can be injected through content creation fields",
      "Draft access control — verify that unpublished/draft content cannot be accessed by guessing URLs or IDs",
      "Media upload abuse — check if file upload endpoints properly validate file types and sizes",
      "SEO poisoning — test if meta tags or structured data can be manipulated through content fields",
      "Comment/reply spam — verify rate limiting on user-generated content submissions",
      "Content ownership bypass — test if content authored by one user can be modified or deleted by another",
    ],
  },
};

const DEFAULT_PACK: AttackPack = {
  name: "General Security Pack",
  icon: "🛡️",
  vectors: [
    "IDOR (Insecure Direct Object Reference) — test if changing resource IDs in API calls exposes other users' data",
    "Authentication bypass — verify that protected endpoints cannot be accessed without valid session tokens",
    "Mass assignment — check if additional fields can be injected in POST/PUT requests to escalate privileges",
    "Rate limiting — verify that login, registration, and password reset endpoints are properly rate-limited",
    "CORS misconfiguration — test if the API accepts requests from unauthorized origins",
    "Information disclosure — check if error responses leak stack traces, database queries, or internal paths",
  ],
};

/**
 * Returns the attack pack for a given business type.
 * Falls back to the general security pack for unknown types.
 */
export function getAttackPack(businessType: string): AttackPack {
  return ATTACK_PACKS[businessType] ?? DEFAULT_PACK;
}

/**
 * Formats the attack pack vectors as a prompt-injection string
 * suitable for appending to agent system prompts.
 */
export function getAttackPackPrompt(businessType: string): string {
  const pack = getAttackPack(businessType);
  const vectorList = pack.vectors
    .map((v, i) => `  ${i + 1}. ${v}`)
    .join("\n");
  return `\n\n--- ${pack.icon} ${pack.name} (Business-Type-Specific Attack Vectors) ---\nIn addition to your standard analysis, specifically test for these attack vectors that are common in ${businessType} applications:\n${vectorList}\n\nFor each vector you test, report whether the application is vulnerable or protected. Include specific evidence of your testing.`;
}
