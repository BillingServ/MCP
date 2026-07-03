#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue | QueryValue[]>;
type BodyValue = QueryValue | QueryValue[];
type BodyParams = Record<string, BodyValue | Record<string, BodyValue>>;

type EndpointDefinition = {
  path: string;
  description: string;
  pathParams?: readonly string[];
  requiredQueryParams?: readonly string[];
};

const ENDPOINTS = [
  { path: 'country/get', description: 'Get country by id.', requiredQueryParams: ['id'] },
  { path: 'country/lists', description: 'List countries.' },
  { path: 'county/lists-by-country', description: 'List counties/states by country_id.', requiredQueryParams: ['country_id'] },
  { path: 'customer/get', description: 'Get customer by id.', requiredQueryParams: ['id'] },
  { path: 'customer/get-credit', description: 'Get customer credit balance by customer id.', requiredQueryParams: ['id'] },
  { path: 'customer/lists', description: 'List customers. Optional: search, page, per_page, sort_by (one of id, name, username, email, created_at, updated_at), sort_dir (asc or desc).' },
  { path: 'invoice/get-payment-method', description: 'Get the payment method used for an invoice.', requiredQueryParams: ['invoice_id'] },
  { path: 'invoice/get-transactions', description: 'Get transactions for an invoice.', requiredQueryParams: ['invoice_id'] },
  { path: 'invoice/lists', description: 'List invoices filtered by status. status must be one of UNPAID, PAID, OVERDUE, REFUNDED, CANCELED, PENDING, ALL (uppercase). Optional: per_page (max 100). Response includes customer_id, invoice_number, total, due_at.', requiredQueryParams: ['status'] },
  { path: 'marketing/get-discount', description: 'Get discount by discount_id.', requiredQueryParams: ['discount_id'] },
  { path: 'marketing/lists', description: 'List discounts. Optional: type (0 = percentage, 1 = fixed/code), per_page.' },
  { path: 'meter/{customer_id}/get/{order_id}', description: 'List usage meters for an order. customer_id is the customer that owns the order.', pathParams: ['customer_id', 'order_id'] },
  { path: 'module/get-module-configuration', description: 'Get configuration for a module by module name.', requiredQueryParams: ['module'] },
  { path: 'order/available-package-changes', description: 'List package changes available for an order.', requiredQueryParams: ['order_id'] },
  { path: 'order/check-fraud', description: 'Check order fraud status. Optional: paymentMethod.number.', requiredQueryParams: ['order_id'] },
  { path: 'order/get-orders', description: 'List orders. Optional: per_page.' },
  { path: 'order/get-orders-by-status', description: 'List orders by status. status must be one of RECENT, PENDING, SETUP, SHIPPED, CANCELLED, RETURNED, TERMINATED, SUSPEND (uppercase). Optional: per_page.', requiredQueryParams: ['status'] },
  { path: 'order/preview-package-change', description: 'Preview a package change for an order.', requiredQueryParams: ['order_id', 'package_id', 'cycle_id'] },
  { path: 'package/get', description: 'Get package by id.', requiredQueryParams: ['id'] },
  { path: 'package/get-by-customer', description: 'Get packages available to a customer. Optional: per_page.', requiredQueryParams: ['customer_id'] },
  { path: 'package/group/get', description: 'Get package group by id.', requiredQueryParams: ['id'] },
  { path: 'package/group/lists', description: 'List package groups. Optional: per_page.' },
  { path: 'package/lists', description: 'List packages. Optional: featured, per_page.' },
  { path: 'package/option/get', description: 'Get package option by id.', requiredQueryParams: ['id'] },
  { path: 'package/option/lists', description: 'List package options. Optional: per_page.' },
  { path: 'package/show', description: 'Show package details by id.', requiredQueryParams: ['id'] },
  { path: 'report/annual-sales', description: 'Get annual sales report.' },
  { path: 'report/customer-credit', description: 'Get customer credit report. Optional: per_page.' },
  { path: 'report/customer-debt', description: 'Get customer debt report (customers that owe money). Optional: per_page.' },
  { path: 'report/customer-invoice', description: 'Get customer invoice report (all invoices with customer names and amounts). Optional: per_page.' },
  { path: 'report/customer-receipt', description: 'Get customer receipt report. Optional: per_page.' },
  { path: 'report/login-history', description: 'Get login history report.' },
  { path: 'report/package-leaderboard', description: 'Get package leaderboard report (best-selling packages). Optional: per_page.' },
  { path: 'report/revenue-trend', description: 'Get revenue trend report.' },
  { path: 'report/sales-by-customer', description: 'Get sales by customer report. Optional: timeframe (one of yearly, monthly, daily), date (YYYY-MM-DD), per_page.' },
  { path: 'report/sales-by-staff', description: 'Get sales by staff report. Optional: timeframe (one of yearly, monthly, daily), date (YYYY-MM-DD).' },
  { path: 'setting/get-staff', description: 'Get staff user by user_id.', requiredQueryParams: ['user_id'] },
  { path: 'setting/get-tax-class', description: 'Get tax class by class_id.', requiredQueryParams: ['class_id'] },
  { path: 'setting/get-tax-zone', description: 'Get tax zone by zone_id.', requiredQueryParams: ['zone_id'] },
  { path: 'setting/invoice', description: 'Get invoice settings.' },
  { path: 'setting/lists-staff', description: 'List staff users. Optional: per_page.' },
  { path: 'setting/lists-tax-class', description: 'List tax classes. Optional: per_page.' },
  { path: 'setting/lists-tax-zone', description: 'List tax zones. Optional: per_page.' },
  { path: 'ticket/get', description: 'Get a support ticket with its messages by id.', requiredQueryParams: ['id'] },
  { path: 'ticket/lists', description: 'List support tickets. Optional filters: user_id (customer id), status (one of open, pending, close, awaiting_reply), priority (one of low, medium, high, emergency), support_department, assignee_by (staff user id).' },
  { path: 'vpn/branding/get', description: 'Get VPN branding.' },
  { path: 'vpn/servers/list', description: 'List VPN servers. Optional: per_page.' }
] as const satisfies readonly EndpointDefinition[];

type WriteEndpointDefinition = {
  path: string;
  description: string;
  requiredBodyParams?: readonly string[];
};

const WRITE_ENDPOINTS = [
  { path: 'customer/add-note', description: 'Add an internal note to a customer. Required body: id (customer id), note.', requiredBodyParams: ['id', 'note'] },
  { path: 'customer/create', description: 'Create a customer. Required body: name, address_1, city, county_id, country_id, postal_code, phone, username, password. Optional: address_2, fax, website, credit, business_name, comment.', requiredBodyParams: ['name', 'address_1', 'city', 'county_id', 'country_id', 'postal_code', 'phone', 'username', 'password'] },
  { path: 'invoice/create-invoice', description: 'Create a draft invoice for a customer. Does not send it. Required body: customer_id, duedate (MM-DD-YYYY). Optional line items as parallel arrays: record.item, record.description, record.price, record.quantity, record.tax_class, record.tax. Optional: comments.', requiredBodyParams: ['customer_id', 'duedate'] },
  { path: 'invoice/create-quote', description: 'Create a quote for a customer. Required body: customer_id, duedate (MM-DD-YYYY). Optional line items as parallel arrays: record.item, record.description, record.price, record.quantity, record.tax_class, record.tax. Optional: comments.', requiredBodyParams: ['customer_id', 'duedate'] },
  { path: 'invoice/send-invoice', description: 'Send an invoice to the customer by email. Required body: invoice_id.', requiredBodyParams: ['invoice_id'] },
  { path: 'invoice/send-invoice-reminder', description: 'Send a payment reminder for an invoice to the customer. Required body: invoice_id.', requiredBodyParams: ['invoice_id'] },
  { path: 'marketing/create-discount', description: 'Create a discount. Required body: minimum_value, discount_value, start, type (0 = percentage, 1 = fixed/code), recurring (0 or 1), uses. Optional: end, selected_packages.', requiredBodyParams: ['minimum_value', 'discount_value', 'start', 'type', 'recurring', 'uses'] },
  { path: 'order/add-order', description: 'Create an order for a customer. Required body: customer_id, package_id, cycle_id, price. Optional package options as parallel arrays: options.id, options.amount, options.value, options.cycle_type.', requiredBodyParams: ['customer_id', 'package_id', 'cycle_id', 'price'] },
  { path: 'package/create', description: 'Create a package in a package group. Required body: group_id, name. Optional: description, tax, url, prorate (Y or N), trial (days), featured (0 or 1), options (array of package option ids), upgrade_paths (array), and billing cycles as parallel arrays: cycle.cycle (cycle type id: 1 One-Off, 2 Daily, 3 Weekly, 4 Fortnightly, 5 Monthly, 7 Every 3 Months, 10 Every 6 Months, 16 Every 12 Months, 17 Every 24 Months, 18 Every 36 Months), cycle.price, cycle.setup (setup fee). Example: cycle.cycle [5], cycle.price [10], cycle.setup [0] adds a Monthly $10 cycle with no setup fee. Also optional: theme (order page theme: 1 = ecommerce view, 2 = simple; defaults to 2), qty (stock quantity), is_outofstock (0 or 1).', requiredBodyParams: ['group_id', 'name'] },
  { path: 'package/group/create', description: 'Create a package group. Required body: name, type (integer). Optional: description.', requiredBodyParams: ['name', 'type'] },
  { path: 'package/group/update', description: 'Update a package group. Required body: id, name, type (integer). Optional: description.', requiredBodyParams: ['id', 'name', 'type'] },
  { path: 'package/option/create', description: 'Create a package option. Required body: internal_name, display_name, field_type (integer). Optional: options (array), required (Y or N).', requiredBodyParams: ['internal_name', 'display_name', 'field_type'] },
  { path: 'package/option/update', description: 'Update a package option. Required body: id, internal_name, display_name, field_type (integer). Optional: options (array), required (Y or N).', requiredBodyParams: ['id', 'internal_name', 'display_name', 'field_type'] },
  { path: 'package/update', description: 'Update a package. Required body: id, group_id, name. Optional: description, tax, url, prorate (Y or N), trial (days), featured (0 or 1), options (array of package option ids; replaces existing options), upgrade_paths (array), keep (array of existing file ids to retain; existing files not listed are deleted), and billing cycles as parallel arrays: cycle.id, cycle.cycle (cycle type id: 1 One-Off, 2 Daily, 3 Weekly, 4 Fortnightly, 5 Monthly, 7 Every 3 Months, 10 Every 6 Months, 16 Every 12 Months, 17 Every 24 Months, 18 Every 36 Months), cycle.price, cycle.setup (setup fee). cycle.id is required to change cycles: pass an existing cycle id to update that cycle, or null to add a new one. Example: cycle.id [null], cycle.cycle [5], cycle.price [10], cycle.setup [0] adds a Monthly $10 cycle with no setup fee. Existing cycles whose id is not listed in cycle.id are deleted; omit all cycle fields to leave cycles unchanged. Also optional: theme (order page theme: 1 = ecommerce view, 2 = simple), qty (stock quantity), is_outofstock (0 or 1).', requiredBodyParams: ['id', 'group_id', 'name'] },
  { path: 'ticket/create', description: 'Create a support ticket. Required body: subject, user_id (customer id), message, support_department. Optional: priority (one of low, medium, high, emergency), status (one of open, pending, close, awaiting_reply), assignee_by (staff user id).', requiredBodyParams: ['subject', 'user_id', 'message', 'support_department'] },
  { path: 'ticket/reply', description: 'Reply to a support ticket. Required body: id (ticket id), message.', requiredBodyParams: ['id', 'message'] },
  { path: 'ticket/update', description: 'Update a support ticket: change status, priority, subject, department, or assignee. Required body: id (ticket id). Optional: subject, user_id, status (one of open, pending, close, awaiting_reply), priority (one of low, medium, high, emergency), support_department, assignee_by.', requiredBodyParams: ['id'] }
] as const satisfies readonly WriteEndpointDefinition[];

const endpointPaths = ENDPOINTS.map((endpoint) => endpoint.path) as [
  (typeof ENDPOINTS)[number]['path'],
  ...(typeof ENDPOINTS)[number]['path'][]
];

const endpointByPath = new Map<string, EndpointDefinition>(
  ENDPOINTS.map((endpoint) => [endpoint.path, endpoint])
);

const writeEndpointPaths = WRITE_ENDPOINTS.map((endpoint) => endpoint.path) as [
  (typeof WRITE_ENDPOINTS)[number]['path'],
  ...(typeof WRITE_ENDPOINTS)[number]['path'][]
];

const writeEndpointByPath = new Map<string, WriteEndpointDefinition>(
  WRITE_ENDPOINTS.map((endpoint) => [endpoint.path, endpoint])
);

const queryValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null()
]);

const querySchema = z
  .record(z.string(), z.union([queryValueSchema, z.array(queryValueSchema)]))
  .optional()
  .describe('Query string parameters to pass to the BillingServ API endpoint.');

const bodyValueSchema = z.union([queryValueSchema, z.array(queryValueSchema)]);

const bodySchema = z
  .record(z.string(), z.union([bodyValueSchema, z.record(z.string(), bodyValueSchema)]))
  .describe(
    'JSON body for the endpoint. See billingserv_list_endpoints for each endpoint\'s required and optional fields. ' +
    'Dotted field names such as cycle.cycle, record.item, or options.id are parallel arrays inside a nested object: pass them either as dotted keys ({"cycle.cycle": [5], "cycle.price": [10]}) or as a nested object ({"cycle": {"cycle": [5], "price": [10]}}); dotted keys are expanded to the nested form before sending.'
  );

const baseUrl = requiredEnv('BILLINGSERV_API_BASE_URL').replace(/\/+$/, '');
const apiKey = requiredEnv('BILLINGSERV_API_KEY');
const timeoutMs = parseTimeout(process.env.BILLINGSERV_TIMEOUT_MS);

const server = new McpServer(
  {
    name: 'billingserv',
    version: '0.1.8'
  },
  {
    instructions:
      'This server is the authoritative, live source for all BillingServ billing data: customers, invoices, payments, transactions, orders, subscriptions, packages, discounts, support tickets, usage meters, tax settings, staff, and sales/revenue reports. ' +
      'For ANY question about billing, invoices (paid, unpaid, overdue), customers, orders, support tickets, revenue, or account data, use these tools instead of searching local files or databases. ' +
      'Start with billingserv_list_endpoints to discover available endpoints and their required parameters, then call billingserv_get to read data. ' +
      'To create or update support tickets, orders, customers, invoices, quotes, discounts, packages, package groups, and package options, or to send an invoice or payment reminder, use billingserv_create. Always confirm the details with the user before creating, updating, or sending anything.'
  }
);

server.registerTool(
  'billingserv_list_endpoints',
  {
    title: 'List BillingServ endpoints',
    description:
      'List every BillingServ billing API endpoint available through this server, with descriptions and required parameters. Read endpoints cover customers, invoices, payments, orders, packages, discounts, support tickets, usage meters, settings, and sales/revenue reports. Write endpoints cover creating and updating tickets, orders, customers, invoices, quotes, discounts, packages, package groups, and package options, and sending invoices and payment reminders.',
    inputSchema: z.object({})
  },
  async () => ({
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ readEndpoints: ENDPOINTS, writeEndpoints: WRITE_ENDPOINTS }, null, 2)
      }
    ]
  })
);

server.registerTool(
  'billingserv_get',
  {
    title: 'Query live BillingServ billing data',
    description:
      'Fetch live billing data from the BillingServ API: customers, invoices (including unpaid and overdue), payment methods, transactions, orders, subscriptions, packages, discounts, usage meters, tax and staff settings, and sales/revenue reports. ' +
      'Use this for any question about billing, invoices, customers, orders, or revenue. Only allowlisted endpoints can be called.',
    inputSchema: z.object({
      endpoint: z.enum(endpointPaths).describe('Allowlisted BillingServ API endpoint path, relative to /api/v2.'),
      path: z
        .record(z.string(), queryValueSchema)
        .optional()
        .describe('Path parameter values for endpoints with placeholders, such as customer_id and order_id.'),
      query: querySchema
    })
  },
  async ({ endpoint, path, query }) => {
    const endpointDefinition = endpointByPath.get(endpoint);

    if (!endpointDefinition) {
      throw new Error(`Endpoint is not allowlisted: ${endpoint}`);
    }

    validateRequiredParams(endpointDefinition, path ?? {}, query ?? {});

    const response = await callBillingServ(
      fillPathParams(endpointDefinition.path, path ?? {}),
      query ?? {}
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }
);

server.registerTool(
  'billingserv_create',
  {
    title: 'Create or update BillingServ records',
    description:
      'Create or update records in BillingServ: support tickets and ticket replies, orders, customers, customer notes, invoices, quotes, discounts, packages, package groups, and package options. Can also send an invoice or payment reminder to a customer by email. ' +
      'This tool changes real billing data and can email customers, so confirm the details with the user before calling it. ' +
      'Only allowlisted endpoints can be called; deleting records and capturing payments are not available through this server.',
    inputSchema: z.object({
      endpoint: z.enum(writeEndpointPaths).describe('Allowlisted BillingServ write endpoint, relative to /api/v2. All write endpoints use POST.'),
      body: bodySchema
    })
  },
  async ({ endpoint, body }) => {
    const endpointDefinition = writeEndpointByPath.get(endpoint);

    if (!endpointDefinition) {
      throw new Error(`Endpoint is not allowlisted: ${endpoint}`);
    }

    for (const param of endpointDefinition.requiredBodyParams ?? []) {
      const value = body[param];

      if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        throw new Error(`Missing required body parameter: ${param}`);
      }
    }

    const response = await callBillingServ(endpoint, {}, { method: 'POST', body: expandDottedKeys(body) });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }
);

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The BillingServ API (Laravel) reads parallel-array fields like cycle.cycle or record.item
// as nested structures, so dotted keys must be sent as {"cycle": {"cycle": [...]}} in JSON.
function expandDottedKeys(body: BodyParams): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    const parts = key.split('.').filter((part) => part !== '');

    if (parts.length === 0) {
      continue;
    }

    let target = result;

    for (const part of parts.slice(0, -1)) {
      if (!isPlainObject(target[part])) {
        target[part] = {};
      }

      target = target[part] as Record<string, unknown>;
    }

    const leaf = parts[parts.length - 1];

    if (isPlainObject(value) && isPlainObject(target[leaf])) {
      Object.assign(target[leaf] as Record<string, unknown>, value);
    } else {
      target[leaf] = value;
    }
  }

  return result;
}

async function callBillingServ(endpoint: string, query: QueryParams, options: RequestOptions = {}): Promise<unknown> {
  const url = new URL(`${baseUrl}/${endpoint.replace(/^\/+/, '')}`);

  for (const [key, rawValue] of Object.entries(query)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];

    for (const value of values) {
      if (value === null || value === undefined || value === '') {
        continue;
      }

      url.searchParams.append(key, String(value));
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;

    try {
      const method = options.method ?? 'GET';

      response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': 'BillingServ-MCP/0.1.8',
          ...(options.body ? { 'Content-Type': 'application/json' } : {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });
    } catch (error) {
      throw new Error(describeFetchError(error, url), { cause: error });
    }

    const text = await response.text();
    const body = parseJson(text);

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        endpoint,
        error: body ?? text
      };
    }

    return body ?? text;
  } finally {
    clearTimeout(timeout);
  }
}

function validateRequiredParams(
  endpoint: EndpointDefinition,
  pathParams: Record<string, QueryValue>,
  query: QueryParams
): void {
  for (const param of endpoint.pathParams ?? []) {
    if (pathParams[param] === null || pathParams[param] === undefined || pathParams[param] === '') {
      throw new Error(`Missing required path parameter: ${param}`);
    }
  }

  for (const param of endpoint.requiredQueryParams ?? []) {
    const value = query[param];

    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      throw new Error(`Missing required query parameter: ${param}`);
    }
  }
}

function fillPathParams(endpoint: string, params: Record<string, QueryValue>): string {
  return endpoint.replace(/\{([^}]+)\}/g, (match, key: string) => {
    const value = params[key];

    if (value === null || value === undefined || value === '') {
      throw new Error(`Missing required path parameter: ${key}`);
    }

    return encodeURIComponent(String(value));
  });
}

function describeFetchError(error: unknown, url: URL): string {
  const target = `${url.protocol}//${url.host}`;

  if (error instanceof Error && error.name === 'AbortError') {
    return `Request to ${target} timed out after ${timeoutMs}ms. Increase BILLINGSERV_TIMEOUT_MS if the API is slow.`;
  }

  const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined;
  const detail = cause ?? (error instanceof Error ? error.message : String(error));

  return `Could not reach the BillingServ API at ${target}: ${detail}. Check that BILLINGSERV_API_BASE_URL is correct and the host is reachable.`;
}

function parseJson(text: string): unknown {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function parseTimeout(value: string | undefined): number {
  if (!value) {
    return 15000;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('BILLINGSERV_TIMEOUT_MS must be a positive number.');
  }

  return parsed;
}

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('BillingServ MCP server failed:', error);
  process.exit(1);
});
