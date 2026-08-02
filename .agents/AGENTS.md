# AssetHub V2 Rules

## PM Asset Code Generation Format
When generating new asset codes during Preventive Maintenance (PM) for Monitors and Printers, follow this company-based format rule:
- **TRRHQ** or **TRR**: `TRRHQ-MO-XXXX` (Monitor), `TRRHQ-PR-XXXX` (Printer) (4-digit running number, e.g. 0001)
- **TRRCORP**: `TRRCORP-MXXX` (Monitor), `TRRCORP-PXXX` (Printer) (3-digit running number, e.g. 001)
- **HQ-TRRT** or **TRRT**: `HQ-TRRT-MXXX` (Monitor), `HQ-TRRT-PXXX` (Printer) (3-digit running number)
- **PS**: `PS-MXXX` (Monitor), `PS-PXXX` (Printer) (3-digit running number)
- Any other company: `<COMPANY>-MXXX` or `<COMPANY>-PXXX`

When PM data is submitted, if the serial number for a monitor or printer does not exist in the system, it will automatically create a new `Asset` record mapping to the generated code and the parent computer's location, department, etc.

## Frontend Docker Deployment Rule
**CRITICAL:** The frontend `Dockerfile` in this project simply copies the `dist/` directory into the container. It DOES NOT build the React code itself. 
Therefore, whenever you make changes to the frontend React code (inside `frontend/src`), you MUST manually run `npm run build` in the `frontend` directory FIRST to generate a new `dist/` folder, before you run `docker compose build frontend`. If you skip this step, the Docker container will silently continue serving the old, stale cached frontend code.
