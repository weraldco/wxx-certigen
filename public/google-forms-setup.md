# Google Forms connection

CertiGen accepts Google Form submissions at `/api/google-forms/webhook`. For an MVP, the most dependable connection is an installable Apps Script form-submit trigger.

## Setup

1. Open the Google Form and select **More > Script editor**.
2. Add the script below.
3. Replace `CERTIGEN_URL`, `COHORT_ID`, and `WEBHOOK_SECRET` with the values shown after publishing the cohort.
4. In Apps Script, open **Triggers**, add a trigger for `sendToCertigen`, and choose **From form > On form submit**.
5. Submit one test response and inspect the Apps Script execution log.

The name and email mappings in CertiGen must match the Google Form question titles exactly, including capitalization and punctuation. For example, `Email address` and `What is your email?` are different fields.

Do not test `sendToCertigen` with the **Run** button in Apps Script. A manual run has no form event and therefore no `event.response`. Submit a response through the Google Form instead.

```javascript
const CERTIGEN_URL = "https://your-domain.com/api/google-forms/webhook";
const COHORT_ID = "cohort_0123456789abcdef";
const WEBHOOK_SECRET = "use-the-same-value-as-your-environment-variable";

function sendToCertigen(event) {
  if (!event || !event.response) {
    throw new Error("Use the Google Form 'On form submit' trigger. Submit the form instead of clicking Run.");
  }

  const response = event.response;
  const answers = {};

  response.getItemResponses().forEach((itemResponse) => {
    answers[itemResponse.getItem().getTitle()] = itemResponse.getResponse();
  });

  const result = UrlFetchApp.fetch(CERTIGEN_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "x-certigen-secret": WEBHOOK_SECRET },
    payload: JSON.stringify({
      cohortId: COHORT_ID,
      responseId: response.getId(),
      submittedAt: response.getTimestamp().toISOString(),
      answers,
    }),
    muteHttpExceptions: true,
  });

  console.log(result.getResponseCode(), result.getContentText());
}
```

## Production requirements

- Store only a SHA-256 hash of each cohort webhook secret.
- Treat `cohortId + responseId` as an idempotency key so retries do not issue duplicates.
- Match the submitted email against an eligible attendee list before issuing completion certificates.
- Queue PDF rendering and email delivery instead of performing them in the webhook request.
- Keep feedback answers private and exclude them from certificate verification pages.
