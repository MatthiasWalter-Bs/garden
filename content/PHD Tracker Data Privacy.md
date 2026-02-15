---
publish: true
created: 2026-02-14T13:51:04.827+01:00
modified: 2026-02-15T10:11:10.013+01:00
cssclasses: ""
---

# PhD Tracker App – Data Privacy Assessment

**Institution:** Swiss TPH (Swiss Tropical and Public Health Institute)
**Location:** Allschwil, Canton of Basel-Landschaft, Switzerland
**Date:** 13 February 2026
**Status:** Preliminary assessment (not legal advice)

> **Disclaimer:** This document does not constitute legal advice. Before implementation, the Swiss TPH Data Protection Officer (privacy@swisstph.ch) and, where applicable, the cantonal data protection authority of Basel-Landschaft should be consulted.

---

## 1. Regulatory Framework – Which Laws Apply?

Swiss TPH is a **public-law institution** with its own legal personality under the joint governance of the cantons of Basel-Stadt and Basel-Landschaft, affiliated with the University of Basel. This results in a multi-layered regulatory framework:

### 1.1 Cantonal Law (primarily applicable)

As a public-law institute in the Canton of Basel-Landschaft, Swiss TPH is primarily subject to the **Information and Data Protection Act BL (IDG, SGS 162)** and its associated ordinances (IDV, SGS 162.11 and VIS, SGS 162.51). The IDG governs the handling of personal data by public bodies, defining them in Art. 3 para. 1 as organisational units fulfilling a public task — which applies to Swiss TPH.

### 1.2 Federal Law (supplementary)

The **revised Federal Act on Data Protection (nFADP / nDSG)**, in force since 1 September 2023, primarily applies to private entities and federal bodies. It is relevant to Swiss TPH insofar as it defines the general Swiss data protection standard and applies when collaborating with private partners or engaging external service providers.

### 1.3 EU GDPR (situationally applicable)

The **EU General Data Protection Regulation** applies when:

- Personal data of individuals located in the EU/EEA are processed (e.g. EU-based doctoral candidates, visiting researchers)
- The behaviour of individuals in the EU is monitored
- Collaborations with EU institutions require GDPR-compliant data handling

Given that Swiss TPH employs approximately 1,000 staff from 96 countries and maintains extensive international networks, GDPR compliance will likely be a practical requirement in many cases.

---

## 2. What Data Does the PhD Tracker Collect?

### 2.1 Data Categories (typical)

| Category | Examples | Sensitivity |
|---|---|---|
| **Master data** | Name, date of birth, nationality, contact details | Personal data |
| **Academic data** | Matriculation no., programme, supervisor, thesis title, milestones | Personal data |
| **Performance data** | Exam results, evaluations, reviews, assessments | Personal data (elevated sensitivity) |
| **Contractual data** | Employment contract, salary, funding source, residence status | Personal data (partially sensitive) |
| **Health data** | Sick leave, pregnancy | **Sensitive personal data** |
| **Communications** | Meeting minutes, supervision notes | Personal data (context-dependent) |

### 2.2 Sensitive Personal Data (Art. 5 lit. c nFADP)

The following data categories are classified as sensitive and require enhanced protective measures:

- Data concerning **health** (e.g. sick leave records)
- Data concerning **religious, political, or trade union** views or activities
- Data concerning **ethnic origin**
- Under GDPR additionally: **biometric data**, genetic data

**Recommendation:** Design the PhD Tracker to avoid collecting sensitive personal data wherever possible. If unavoidable (e.g. absence management), such data should be strictly segregated and subject to additional access controls.

---

## 3. Core Data Protection Principles

### 3.1 Privacy by Design & Default

Data protection must be integrated into the app architecture from the outset (Art. 7 nFADP). By default, only the minimum necessary data should be collected and displayed.

**Practical implications for the PhD Tracker:**

- Role-based access control: doctoral candidates see only their own data; supervisors see only their supervisees; admins see aggregated overviews where possible
- Data fields that are not strictly necessary are not collected
- Minimal visibility by default (opt-in rather than opt-out for extended data sharing)

### 3.2 Purpose Limitation

Data may only be processed for the defined purpose. The purpose of the PhD Tracker (e.g. "Tracking and managing the academic progress of doctoral candidates at Swiss TPH") must be clearly defined and communicated. Secondary use (e.g. for research, benchmarking) requires a separate legal basis or consent.

### 3.3 Proportionality / Data Minimisation

Only collect data that is genuinely necessary for the defined purpose. For every data field, ask: "Do we actually need this?"

### 3.4 Accuracy

Data subjects must be able to access their data and request corrections.

### 3.5 Storage Limitation

Data may only be retained for as long as the purpose requires. A deletion policy must be defined (e.g. delete data X years after completion or discontinuation of the doctorate).

---

## 4. Data Storage – Where Can Data Be Stored?

### 4.1 Regulatory Compliance vs. Effective Security

It is important to distinguish between **regulatory compliance** (where are data allowed to reside?) and **effective IT security** (how well are the data actually protected?). These two dimensions do not always align.

**On-premise infrastructure is often the weaker choice from an IT security perspective.** Hyperscalers such as Microsoft Azure, AWS, and Google Cloud invest billions in security infrastructure, employ thousands of security specialists, and operate automated patching, geo-redundancy, and incident response capabilities that a single institution cannot realistically replicate. Real-world threats such as ransomware, insider threats, insufficient redundancy, and inadequate patch management disproportionately affect on-premise infrastructure. The assumption that "own servers = more secure" is a common misconception.

**Swiss hosting providers** offer data residency in Switzerland but cannot match the major cloud providers in terms of feature set, scalability, or security capabilities. Specifically:

- **SWITCHengines** is an OpenStack-based IaaS platform for Swiss universities (data centres in Zurich and Lausanne). It provides VMs and object storage — but **no managed PostgreSQL, no DBaaS, no automated failover.** PostgreSQL would need to be self-managed on a VM (backups, patching, monitoring, disaster recovery). For a production app handling personal data, this represents significant operational overhead and a security risk if the required expertise is not continuously available.
- **Infomaniak** offers more managed services but still falls short of hyperscaler capabilities.

### 4.2 EU/EEA Cloud: Recommended Option

The Federal Council has recognised all EU/EEA states as countries with an adequate level of data protection. Data transfers to these countries are permissible without additional safeguards. **EU cloud regions of major providers (e.g. Azure West Europe, AWS Frankfurt) offer the best combination of regulatory compliance and effective security.** Prerequisite: a data processing agreement (DPA) with the provider.

### 4.3 USA: Conditionally Permissible (since September 2024)

The **Swiss-U.S. Data Privacy Framework** (in effect since 15 September 2024) allows data transfers to certified US companies without additional Standard Contractual Clauses. For non-certified US companies, SCCs and a Transfer Impact Assessment (TIA) remain required. Note: US authorities may, under certain circumstances, demand access to data (CLOUD Act), which can be problematic for sensitive personal data.

### 4.4 Other Third Countries: Only with Safeguards

For countries without an adequacy decision, Standard Contractual Clauses (SCCs) and a TIA are necessary.

### 4.5 Recent Tightening (December 2025)

Swiss data protection authorities adopted an increasingly restrictive stance towards international **SaaS services** in late 2025, particularly regarding sensitive or confidential personal data. For a public institution like Swiss TPH, this means: when handling **sensitive data** (health data, etc.), the cloud provider should be evaluated carefully — not primarily by location, but by effective data control, encryption architecture, and contractual guarantees.

### 4.6 Storage Location Recommendation

| Priority | Option | Assessment |
|---|---|---|
| 1 (recommended) | EU cloud region with hyperscaler (Azure West Europe, AWS Frankfurt) | Best combination of security, compliance, and scalability; DPA required |
| 2 | Swiss cloud (e.g. Infomaniak) | Regulatorily straightforward, but limited feature set; SWITCHengines is IaaS only with no managed DB |
| 3 | US cloud (certified under DPF) | Only for non-sensitive data; CLOUD Act considerations |
| 4 | On-premise Swiss TPH / University of Basel | Regulatorily straightforward, but elevated risk from ransomware, lack of redundancy, and limited security personnel |

---

## 5. Information and Documentation Obligations

### 5.1 Duty to Inform (Art. 19 nFADP / IDG BL)

When data is captured in the PhD Tracker, data subjects (doctoral candidates, students, etc.) must be informed about:

- Identity and contact details of the data controller (Swiss TPH)
- Purpose of the data processing
- Recipients or categories of recipients
- For cross-border transfers: destination country and safeguards
- Rights of data subjects (access, rectification, deletion)

**Implementation:** Data privacy notice within the app, consent upon first login.

### 5.2 Record of Processing Activities (Art. 12 nFADP)

The PhD Tracker must be documented in Swiss TPH's record of processing activities, including information on purpose, data categories, recipients, retention periods, and any cross-border transfers.

### 5.3 Data Protection Impact Assessment (DPIA)

If the app processes sensitive personal data on a larger scale or involves systematic profiling/monitoring, a **DPIA** is required (Art. 22 nFADP). Recommendation: conduct a DPIA, as performance data and potentially health data may be involved.

---

## 6. Rights of Data Subjects

Doctoral candidates and other tracked individuals have the following rights:

- **Right of access:** View all data stored about them at any time
- **Right to rectification:** Request correction of inaccurate data
- **Right to erasure:** Request deletion under certain conditions (may be limited by statutory retention obligations)
- **Right to data portability:** Receive data in a commonly used format (Art. 28 nFADP)
- **Right to object:** Object to certain forms of processing

**Implementation:** Self-service area within the app where doctoral candidates can view and export their data. Formal process for deletion and rectification requests.

---

## 7. Technical and Organisational Measures (TOMs)

### 7.1 Access Control

- Role-based access control (RBAC): doctoral candidates, supervisors, programme coordinators, admins
- Multi-factor authentication (MFA)
- Single sign-on via existing Swiss TPH / University of Basel infrastructure (e.g. SWITCHaai)

### 7.2 Encryption

- Data in transit: TLS 1.2+
- Data at rest: database encryption
- Sensitive personal data: consider field-level encryption

### 7.3 Logging and Audit

- Log access to personal data
- Document changes traceably (audit trail)
- Regular log reviews

### 7.4 Data Backup

- Regular encrypted backups
- Disaster recovery plan
- Store backups in Switzerland

### 7.5 Data Breach Notification

Data security breaches must be reported to the FDPIC (and, where applicable, the cantonal supervisory authority) as quickly as possible if they pose a high risk to the affected individuals (Art. 24 nFADP). An internal incident response process must be defined.

---

## 8. Third-Party Data Processing

If external service providers are engaged (e.g. hosting, software development, cloud services), **data processing agreements** (Art. 9 nFADP) must be concluded. These must address: the processor's obligation to follow instructions, technical and organisational measures, sub-processors, and obligations upon contract termination (data deletion/return).

---

## 9. Project Checklist

- [ ] Involve the Swiss TPH **Data Protection Officer** early (privacy@swisstph.ch)
- [ ] Clarify the **legal basis**: which provision of the IDG BL legitimises the processing?
- [ ] Create/update the **record of processing activities**
- [ ] Conduct a **Data Protection Impact Assessment (DPIA)**
- [ ] Draft a **data privacy notice** for the app
- [ ] Define a **retention and deletion policy**
- [ ] Design the **access control concept** (RBAC)
- [ ] Conclude **data processing agreements** with external service providers
- [ ] Implement a **consent / information process** on first use
- [ ] Determine the **storage location** (Switzerland preferred)
- [ ] Define and document **TOMs**
- [ ] Establish an **incident response process** for data breaches
- [ ] Assess whether the **GDPR** is additionally applicable (EU-based doctoral candidates)
- [ ] Clarify whether existing **University of Basel IT policies** must be observed

---

## 10. Summary of Regulatory Layers

```
┌─────────────────────────────────────────────────┐
│           EU GDPR (situational)                 │
│   Where EU nexus exists: doctoral candidates    │
│   from EU, collaborations with EU institutions  │
├─────────────────────────────────────────────────┤
│     Federal law: nFADP (since 1 Sept 2023)      │
│   General Swiss data protection standard,       │
│   Privacy by Design, breach notification, fines │
├─────────────────────────────────────────────────┤
│   Cantonal law: IDG BL (SGS 162)                │
│   Primarily applicable for public bodies,       │
│   incl. Swiss TPH as a public-law institute     │
│   in the Canton of Basel-Landschaft             │
├─────────────────────────────────────────────────┤
│   Institutional: Swiss TPH Policies             │
│   Internal data protection framework, DPO,      │
│   University of Basel guidelines                │
└─────────────────────────────────────────────────┘
```

---

## Sources and Further Reading

- [Cantonal Data Protection Authority BL](https://www.baselland.ch/politik-und-behorden/besondere-behoerden/datenschutz)
- [IDG BL (SGS 162) – Legal Text](https://bl.clex.ch/app/de/texts_of_law/162)
- [Swiss TPH Data Privacy Policy](https://www.swisstph.ch/en/data-privacy-policy)
- [nFADP Overview (WEKA)](https://www.weka.ch/themen/datenschutz-und-it-recht/datenschutz-umsetzen/article/ndsg-eine-uebersicht-zum-neuen-datenschutzgesetz/)
- [Swiss-U.S. Data Privacy Framework (activeMind)](https://www.activemind.ch/blog/swiss-us-data-privacy-framework/)
- [Data Transfer Abroad (datenschutz.law)](https://datenschutz.law/ratgeber/wann-darf-ich-personendaten-ins-ausland-weitergeben-auf-dem-weg-zum-revdsg-teil-7)
- [Cloud Services and nFADP (Netzwoche)](https://www.netzwoche.ch/news/2021-03-10/so-beeinflusst-das-neue-datenschutzgesetz-die-nutzung-von-cloud-diensten/0lt0)
