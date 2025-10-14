LexiAid Deployment: Handover & Status Report
Date: October 14, 2025
Status: Stalled - Root cause of external access failure identified. Awaiting corrective action.

1. Executive Summary
This document summarizes the diagnostic and troubleshooting session for the LexiAid application deployment on a production Hostinger VPS. While the application runs successfully in a local development environment, the VPS deployment is inaccessible from the internet.

Through a series of systematic checks, we have concluded that the primary failure is at the host networking layer, caused by a Docker Swarm service misconfiguration in the Traefik reverse proxy. This prevents Traefik from binding to the necessary public ports (80 and 443), resulting in all external connection attempts being refused.

A secondary issue was also identified: the lexiaid_backend service is in a crash loop and is not running. This report details the system architecture, the tests performed, the definitive findings, and the immediate next steps required to resolve these issues.

2. System Architecture Overview
2.1. VPS Environment
Provider: Hostinger

Public IP Address: 147.93.46.119

Orchestration: Docker in Swarm Mode.

Project Directory: ~/LexiAid

2.2. Docker Swarm Structure
The VPS runs multiple applications as distinct Docker Swarm stacks. Key services relevant to this issue include:

traefik stack: Contains the single traefik_traefik service, which acts as the reverse proxy for the entire server.

lexiaid stack: Contains the lexiaid_frontend and lexiaid_backend services.

Other Stacks: chatwoot, n8n, portainer, and others are running in parallel, indicating the core Swarm and Traefik infrastructure is generally functional.

Networking: All relevant services are connected to a shared overlay network named hankellnet, allowing for inter-service communication.

2.3. LexiAid Deployment Workflow
The deployment process from the VPS consists of two distinct steps:

Build Images: docker-compose build --no-cache

Deploy Stack: docker stack deploy -c docker-compose.yml lexiaid

3. Diagnostic Session: Tests & Key Findings
A series of diagnostic commands were executed on the VPS. The following are the most critical findings.

3.1. Service Status Check
Command: docker service ls

Result:

The traefik_traefik service is running with 1/1 replicas.

The lexiaid_frontend service is running with 1/1 replicas.

CRITICAL FINDING: The lexiaid_backend service is not running, showing 0/1 replicas. docker service ps confirmed it is in a crash loop with a non-zero exit (255) error.

3.2. Host Port Listening Check
Command: sudo ss -ltnp | egrep ':80\b|:443\b'

Result:

CRITICAL FINDING (THE SMOKING GUN): This command produced no output. This definitively proves that no process on the host OS is listening on ports 80 or 443. All external web traffic is being refused before it can even reach Traefik.

3.3. Traefik Service Configuration Inspection
Command: docker service inspect traefik_traefik --pretty

Result:

CRITICAL FINDING (THE ROOT CAUSE): The port configuration for this service was revealed to be:

Ports:
 PublishedPort = 80
 Protocol = tcp
 TargetPort = 80
 PublishMode = host
PublishedPort = 443
 Protocol = tcp
 TargetPort = 443
 PublishMode = host

The PublishMode = host setting is the cause of the failure. In Swarm, this mode attempts a direct port bind which often fails and bypasses the Swarm's essential routing mesh. The correct mode for exposing services across a Swarm is ingress.

3.4. External Connection Test
Command: curl -vkI https://lexiaid.hankell.com.br/ and curl -vI http://lexiaid.hankell.com.br/

Result:

Both commands failed with Connection refused. This result is a direct symptom of the findings from the ss command; since no process is listening on the ports, the kernel actively refuses the connection. This correctly rules out firewall issues, which would typically result in a timeout or a silent drop.

4. Current Challenges & Unresolved Issues
Based on the investigation, we are facing two distinct and critical problems:

No External Access: The traefik_traefik service is misconfigured with PublishMode = host, preventing it from listening on public ports 80 and 443. This is the sole reason the application is inaccessible.

Backend Service Failure: The lexiaid_backend service is in a persistent crash loop. The cause is unknown but is likely an application-level error or a misconfiguration specific to the VPS environment (e.g., missing environment variables, database connection issues). This issue cannot be fully diagnosed until the external access issue is resolved, but initial logs can be pulled.

5. Action Plan & Next Steps
A two-step plan has been formulated to address these issues in order of priority.

Correct Traefik Port Publishing:

Phase 1 (Planning): An AI Code Agent (ACA) has been prompted to analyze the Traefik configuration file and formulate a plan to change the port PublishMode from host to ingress.

Phase 2 (Implementation): Upon approval of the plan, the ACA will be instructed to apply the changes and redeploy the traefik stack.

Diagnose Backend Crash Loop:

Phase 1 (Data Gathering): Once Traefik is operational, we will gather logs from the failing lexiaid_backend service using docker service logs lexiaid_backend.

Phase 2 (Analysis & Remediation): The logs will be analyzed to determine the cause of the crash, and a new plan will be formulated with the ACA to correct the underlying issue in the backend's Dockerfile, code, or service configuration.