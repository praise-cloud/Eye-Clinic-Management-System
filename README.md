# Eye Clinic Management System

An offline-first Electron desktop application for clinic operations. It provides role-based workflows for admins, doctors, and assistants to manage patients, tests, prescriptions, inventory, reports, and internal messaging. The system stores data locally in SQLite for reliability, supports legacy data import (including `.bak` conversion), and includes CVF/Henson 8000 workflows for case-study collaboration. Optional SQL Server sync is available for environments that require a central server while keeping local SQLite as the primary store.

## Highlights
- Role-based access for admin, doctor, assistant
- Patients, tests, prescriptions, inventory, reports
- Internal chat + notifications
- Legacy import with multi-strategy `.bak` conversion
- CVF workspace for doctor/assistant collaboration
- Offline-first SQLite with optional SQL Server sync

## Status
Release Candidate (RC). Final clinic environment validation is still required.

## Documentation
All detailed project documentation and historical notes are consolidated in `Context.md`. Update `Context.md` whenever application changes are made.
