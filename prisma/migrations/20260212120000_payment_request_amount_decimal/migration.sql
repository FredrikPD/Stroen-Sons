-- Change PaymentRequest.amount from integer to decimal with 2-digit scale.
ALTER TABLE "PaymentRequest"
ALTER COLUMN "amount" TYPE DECIMAL(10,2)
USING "amount"::DECIMAL(10,2);
