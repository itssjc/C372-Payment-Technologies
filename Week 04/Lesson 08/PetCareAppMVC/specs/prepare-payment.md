# Feature: Prepare payment details

## 1. User goal
As a pet owner, I want to review a selected service and its amount before payment.

## 2. Scope
Return the selected service and its catalogue amount for review before payment.
Use the server-side catalogue price. Do not use a client-supplied payment amount.

This feature does not charge money, integrate with a payment gateway, create
transactions or database tables, add EJS pages, or change existing features.

## 3. Request
`GET /payments/prepare/:serviceId`

## 4. Service catalogue
The catalogue is the source of service IDs, names, and prices:

| ID | Service name | Price |
|---:|---|---:|
| 1 | Vaccination | 35 |
| 2 | Pet Grooming | 50 |
| 3 | Boarding | 80 |

## 5. Successful response
For a successful request, return HTTP 200. The response body must be a JSON
object with exactly these five top-level fields:

| Field | Type | Value |
|---|---|---|
| `serviceId` | number | The selected catalogue service ID |
| `serviceName` | string | The selected catalogue service name |
| `amount` | number | The selected catalogue price |
| `currency` | string | `"sgd"` |
| `status` | string | `"READY_FOR_PAYMENT"` |

`READY_FOR_PAYMENT` is a response label for the prepared service details. It
does not indicate that payment has been authorized or completed.

## 6. Unsuccessful response
For an unknown service, return HTTP 404 with this exact JSON object:

```json
{"error":"Service not found"}
```

## 7. Acceptance criteria
- AC1: `GET /payments/prepare/1` returns HTTP 200 with `serviceId` 1,
  `serviceName` `"Vaccination"`, and `amount` 35.
- AC2: `GET /payments/prepare/2` returns HTTP 200 with `serviceId` 2,
  `serviceName` `"Pet Grooming"`, and `amount` 50.
- AC3: `GET /payments/prepare/3` returns HTTP 200 with `serviceId` 3,
  `serviceName` `"Boarding"`, and `amount` 80.
- AC4: `GET /payments/prepare/999` returns HTTP 404 with exactly
  `{"error":"Service not found"}`.
- AC5: Each successful response has exactly the five top-level fields listed
  above, with the specified types and values, including `"sgd"` and
  `"READY_FOR_PAYMENT"`.
- AC6: The amount in a successful response is the catalogue price, not an
  amount supplied by the client.

Access: No login is required for this classroom mock.

## 8. Open questions
- Are all catalogue prices in SGD?
- Which `serviceId` formats are valid? How should malformed values (for
  example, text or decimals) be handled?
- Does the 404 rule apply to every well-formed ID that is absent from the
  catalogue? Are any other failure cases in scope?
- If a request includes a client-supplied amount, should it be ignored,
  rejected, or handled another way?
