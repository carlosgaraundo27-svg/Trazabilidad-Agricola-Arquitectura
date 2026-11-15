-- Solo bases desechables: nunca un procedimiento de corrección histórica.
DROP TRIGGER quality_closure_guard ON quality.evaluations;
DROP FUNCTION quality.guard_closure();
DROP TABLE intake.receipt_temperatures;
DROP FUNCTION intake.guard_original_temperature();
