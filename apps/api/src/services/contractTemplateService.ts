import { getGlobalSettings, getDefaultBranding } from './globalSettingsService';
import {
  extractFacilityTimezone,
  formatTimeLabel,
  formatWeekdayList,
  normalizeServiceSchedule,
} from './serviceScheduleService';

export interface ContractTemplateData {
  contractNumber?: string;
  title?: string;
  serviceCategory?: string | null;
  proposalType?: string | null;
  accountName: string;
  facilityAddress?: unknown;
  facilityName?: string | null;
  startDate: Date | string;
  endDate?: Date | string | null;
  monthlyValue: number;
  totalValue?: number | null;
  billingCycle?: string;
  paymentTerms?: string;
  serviceFrequency?: string | null;
  serviceSchedule?: unknown;
  facilityTimezone?: string | null;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  scopeDescription?: string | null;
  equipmentProvidedBy?: string | null;
  chemicalsProvidedBy?: string | null;
  approvedChemicalNotes?: string | null;
  restrictedChemicalNotes?: string | null;
  equipmentNotes?: string | null;
  requiresSpecialEquipment?: boolean | null;
  specialEquipmentNotes?: string | null;
  sdsRequired?: boolean | null;
  storageAllowedOnSite?: boolean | null;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '_______________';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '$0.00';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

function formatFrequency(freq: string | null | undefined): string {
  const map: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    bi_weekly: 'Bi-Weekly',
    biweekly: 'Bi-Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
  };
  return freq ? (map[freq] ?? freq) : 'As agreed upon';
}

function formatAddress(value: unknown): string {
  if (!value) return '[Facility Address]';
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || Array.isArray(value)) return '[Facility Address]';

  const address = value as Record<string, unknown>;
  const line1 = [address.street, address.line1].find((entry) => typeof entry === 'string');
  const city = [address.city, address.town].find((entry) => typeof entry === 'string');
  const state = [address.state, address.province].find((entry) => typeof entry === 'string');
  const postal = [address.postalCode, address.zip, address.zipCode]
    .find((entry) => typeof entry === 'string');
  const country = typeof address.country === 'string' ? address.country : null;

  const parts = [
    line1 as string | undefined,
    [city, state, postal].filter(Boolean).join(', '),
    country ?? undefined,
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : '[Facility Address]';
}

function formatBillingCycle(cycle: string | null | undefined): string {
  const map: Record<string, string> = {
    weekly: 'weekly',
    biweekly: 'bi-weekly',
    monthly: 'monthly',
    quarterly: 'quarterly',
    annually: 'annually',
  };
  return cycle ? (map[cycle] ?? cycle) : 'monthly';
}

function formatAgreementTitle(data: ContractTemplateData): string {
  const category = `${data.serviceCategory ?? ''} ${data.proposalType ?? ''}`.toLowerCase();
  if (category.includes('residential')) return 'Residential Cleaning Services Agreement';
  if (category.includes('specialized')) return 'Specialized Cleaning Services Agreement';
  return 'Commercial Cleaning Services Agreement';
}

function formatPaymentDueClause(paymentTerms: string): string {
  const normalized = paymentTerms.trim().toLowerCase();
  const netMatch = normalized.match(/^net\s+(\d+)$/);
  if (netMatch) {
    return `are payable within ${netMatch[1]} days of the invoice date ("${paymentTerms}")`;
  }

  switch (normalized) {
    case 'due on receipt':
      return `are due on receipt of the invoice ("${paymentTerms}")`;
    case 'due before service':
      return `are due before services are performed unless otherwise agreed in writing ("${paymentTerms}")`;
    case 'due upon completion':
      return `are due upon completion of the invoiced services ("${paymentTerms}")`;
    case 'monthly recurring billing':
      return `are due according to the recurring billing schedule stated on each invoice ("${paymentTerms}")`;
    case '50% deposit, balance on completion':
      return `require a 50% deposit before work begins, with the balance due upon completion`;
    default:
      return `are payable according to the stated payment terms ("${paymentTerms}")`;
  }
}

function formatProvider(value: string | null | undefined): string {
  switch ((value ?? '').toLowerCase()) {
    case 'client':
      return 'Client';
    case 'mixed':
      return 'both parties as described below';
    case 'company':
    default:
      return 'Service Provider';
  }
}

/**
 * Generate default contract terms and conditions for a Canadian commercial cleaning agreement.
 * Uses `## N. TITLE` heading format for PDF section parsing.
 */
export async function generateContractTerms(data: ContractTemplateData): Promise<string> {
  let branding;
  try {
    branding = await getGlobalSettings();
  } catch {
    branding = getDefaultBranding();
  }

  const companyName = branding.companyName;
  const companyAddress = branding.companyAddress ?? '[Company Address]';
  const companyPhone = branding.companyPhone ?? '[Company Phone]';
  const companyEmail = branding.companyEmail ?? '[Company Email]';

  const accountName = data.accountName;
  const facilityAddress = formatAddress(data.facilityAddress);
  const facilityName = data.facilityName ?? 'the designated facility';
  const startDate = formatDate(data.startDate);
  const endDate = formatDate(data.endDate);
  const monthlyValue = formatCurrency(data.monthlyValue);
  const frequency = formatFrequency(data.serviceFrequency);
  const normalizedSchedule = normalizeServiceSchedule(data.serviceSchedule, data.serviceFrequency);
  const scheduleDays = normalizedSchedule
    ? formatWeekdayList(normalizedSchedule.days)
    : 'Not specified';
  const scheduleWindow = normalizedSchedule
    ? `${formatTimeLabel(normalizedSchedule.allowedWindowStart)} to ${formatTimeLabel(normalizedSchedule.allowedWindowEnd)}`
    : 'Mutually agreed time window';
  const facilityTimezone =
    data.facilityTimezone ?? extractFacilityTimezone(data.facilityAddress) ?? '[Facility timezone]';
  const billingCycle = formatBillingCycle(data.billingCycle);
  const paymentTerms = data.paymentTerms ?? 'Net 30';
  const contractNumber = data.contractNumber ?? '[To Be Assigned]';
  const autoRenew = data.autoRenew ?? false;
  const renewalNoticeDays = data.renewalNoticeDays ?? 30;
  const hasEndDate = !!data.endDate;
  const agreementTitle = formatAgreementTitle(data);
  const paymentDueClause = formatPaymentDueClause(paymentTerms);
  const equipmentProvider = formatProvider(data.equipmentProvidedBy);
  const chemicalProvider = formatProvider(data.chemicalsProvidedBy);
  const approvedChemicalNotes = data.approvedChemicalNotes?.trim();
  const restrictedChemicalNotes = data.restrictedChemicalNotes?.trim();
  const equipmentNotes = data.equipmentNotes?.trim();
  const specialEquipmentNotes = data.specialEquipmentNotes?.trim();
  const sdsText = data.sdsRequired === false
    ? 'SDS documentation is not required unless hazardous products are introduced or applicable law requires it.'
    : 'Safety Data Sheets (SDS) must be available for hazardous products used at the service location, and workers must receive required WHMIS information, instruction, and training.';
  const storageText = data.storageAllowedOnSite
    ? 'On-site storage of approved equipment, chemicals, or supplies is permitted only in the area designated by the Client and only while this Agreement remains active.'
    : 'On-site storage of equipment, chemicals, or supplies is not permitted unless separately approved in writing by the Client.';

  const sections: string[] = [];

  // 1. PARTIES
  sections.push(`## 1. PARTIES

This ${agreementTitle} ("Agreement") is entered into as of ${startDate} ("Effective Date"), by and between:

Service Provider: ${companyName}
Address: ${companyAddress}
Phone: ${companyPhone}
Email: ${companyEmail}

Client: ${accountName}
Service Location: ${facilityAddress}

Contract Reference: ${contractNumber}`);

  // 2. SCOPE OF SERVICES
  sections.push(`## 2. SCOPE OF SERVICES

The Service Provider agrees to provide cleaning services to the Client at ${facilityName}, located at ${facilityAddress}, at a frequency of ${frequency.toLowerCase()}.

Services shall include, but are not limited to, general cleaning, sanitization, and maintenance of the premises as mutually agreed upon. The specific scope of work shall be as described in the associated proposal or as otherwise documented in writing between the parties.

Services not expressly listed in the proposal, service schedule, or written scope are excluded unless agreed in writing. Excluded work may include hazardous material cleanup, biohazards, pest infestation cleanup, mould remediation, hoarding conditions, bodily fluids, exterior work, high-risk ladder work, moving heavy furniture, restoration work, and any task requiring licensing or specialized remediation unless specifically included.

Any additional services requested beyond the agreed scope shall be subject to separate written authorization and pricing. The Service Provider may decline or pause work that is outside scope, unsafe, illegal, or not reasonably contemplated when pricing was issued.`);

  // 3. TERM AND RENEWAL
  const termRenewalText = hasEndDate
    ? `This Agreement shall commence on ${startDate} ("Commencement Date") and shall continue until ${endDate} ("Initial Term"), unless terminated earlier in accordance with Section 7.`
    : `This Agreement shall commence on ${startDate} ("Commencement Date") and shall continue on a month-to-month basis until terminated in accordance with Section 7.`;

  const renewalText = autoRenew
    ? `Upon expiration of the Initial Term, this Agreement shall automatically renew for successive periods of equal duration under the same terms and conditions, unless either party provides written notice of non-renewal at least ${renewalNoticeDays} days prior to the end of the then-current term.`
    : `This Agreement shall not automatically renew. Any renewal must be agreed upon in writing by both parties prior to the expiration of the current term.`;

  sections.push(`## 3. TERM AND RENEWAL

${termRenewalText}

${renewalText}`);

  // 4. SERVICE SCHEDULE
  sections.push(`## 4. SERVICE SCHEDULE

Services shall be performed at a frequency of ${frequency.toLowerCase()} on the following service day(s): ${scheduleDays}.

Approved service window: ${scheduleWindow} (${facilityTimezone}, start-day anchor). Any service activity outside this approved window requires prior written authorization from the Client or an authorized manager.

The Client shall provide reasonable access to the premises for the Service Provider to perform the contracted services. Key and access arrangements, including alarm codes, fobs, parking, elevators, pets, security protocols, and site contacts, shall be agreed upon separately and documented in writing. The Service Provider shall ensure the secure handling of all access credentials and return them promptly upon termination of this Agreement.

If the Service Provider cannot reasonably access the premises during the approved service window due to lockout, missing keys or fobs, blocked access, unsecured pets, unavailable utilities, unsafe conditions, or Client-caused delay, the visit may be treated as completed or may be rescheduled subject to applicable minimum charges, cancellation fees, or additional labour charges.`);

  sections.push(`## 4A. CLIENT RESPONSIBILITIES

The Client shall maintain the service location in a condition that allows the services to be performed safely and efficiently, including reasonable access to water, electricity, lighting, washroom facilities where applicable, parking or loading access where applicable, and a safe working environment.

The Client shall secure pets, valuables, fragile items, confidential materials, firearms, medication, cash, jewellery, and personal property before service begins. The Service Provider is not responsible for loss or damage to unsecured valuables, pre-existing damage, defective fixtures, improperly installed items, unstable furniture, or items that are unusually fragile unless the Service Provider's gross negligence or wilful misconduct caused the loss.

The Client shall promptly notify the Service Provider of any known hazards, special site rules, restricted areas, alarm procedures, building policies, infection-control requirements, chemical sensitivities, or changes in site condition that may affect scope, price, timing, or worker safety.`);

  // 5. COMPENSATION AND PAYMENT
  sections.push(`## 5. COMPENSATION AND PAYMENT

The Client agrees to pay the Service Provider ${monthlyValue} CAD per month for the services described herein. Invoices shall be issued on a ${billingCycle} basis and ${paymentDueClause}.

Late payments shall accrue interest at a rate of 1.5% per month (18% per annum) on any outstanding balance past due. The Service Provider reserves the right to suspend services if payment remains outstanding for more than 30 days.

All amounts are exclusive of applicable taxes. The Client is responsible for the payment of Goods and Services Tax (GST), Provincial Sales Tax (PST), and/or Harmonized Sales Tax (HST) as applicable.

Pricing is based on the scope, site condition, frequency, labour assumptions, supply assumptions, access assumptions, and schedule known at the time of agreement. Material changes to scope, site condition, frequency, minimum wage, statutory costs, consumable costs, parking, travel, insurance, taxes, or required equipment may require a written price adjustment or change order.`);

  // 6. INSURANCE AND LIABILITY
  sections.push(`## 6. INSURANCE AND LIABILITY

The Service Provider shall maintain, at its own expense, the following insurance coverage throughout the term of this Agreement:

(a) Commercial General Liability (CGL) insurance with a minimum limit of $2,000,000 per occurrence;
(b) Workers' Compensation coverage as required by the applicable provincial legislation;
(c) Automobile liability insurance for any vehicles used in the performance of services.

Certificates of insurance shall be provided to the Client upon request. The Service Provider's total liability under this Agreement shall not exceed the total fees paid by the Client in the twelve (12) months immediately preceding the claim, except in cases of gross negligence or wilful misconduct.`);

  sections.push(`## 6A. SERVICE QUALITY, DAMAGE REPORTING, AND REMEDIES

The Client shall report any service concern, missed task, or alleged damage in writing within forty-eight (48) hours of the service visit, with reasonable details and photographs where applicable. The Service Provider shall be given a reasonable opportunity to inspect and correct verified service deficiencies.

The Client's primary remedy for ordinary service deficiencies is re-performance or correction of the affected service area where reasonably possible. Credits, refunds, or other remedies must be approved in writing and shall not exceed the value of the affected service visit except where prohibited by law.

The Service Provider is not responsible for damage caused by normal wear and tear, defective or improperly installed surfaces or fixtures, manufacturer defects, client-provided chemicals or equipment, pre-existing conditions, or instructions given by the Client that are contrary to manufacturer guidance or safe work practices.`);

  // 7. TERMINATION
  sections.push(`## 7. TERMINATION

Either party may terminate this Agreement by providing thirty (30) days' written notice to the other party.

Either party may terminate this Agreement immediately for cause if the other party:
(a) Commits a material breach of this Agreement and fails to cure such breach within fifteen (15) days of receiving written notice thereof;
(b) Becomes insolvent, files for bankruptcy, or has a receiver appointed over its assets.

Upon termination, the Client shall pay for all services performed up to the effective date of termination. Any prepaid amounts for services not yet rendered shall be refunded within thirty (30) days.`);

  // 8. INDEMNIFICATION
  sections.push(`## 8. INDEMNIFICATION

Each party ("Indemnifying Party") agrees to indemnify, defend, and hold harmless the other party and its officers, directors, employees, and agents from and against any claims, damages, losses, and expenses (including reasonable legal fees) arising out of or resulting from the Indemnifying Party's negligence or wilful misconduct in connection with this Agreement.

The Client shall indemnify the Service Provider against any claims arising from hazards at the premises that the Client knew or reasonably should have known about but failed to disclose.`);

  // 9. CONFIDENTIALITY
  sections.push(`## 9. CONFIDENTIALITY

Both parties agree to maintain the confidentiality of all proprietary and confidential information disclosed by the other party during the term of this Agreement. This obligation shall survive the termination of this Agreement for a period of two (2) years.

Confidential information shall not include information that is or becomes publicly available through no fault of the receiving party, was already known to the receiving party, or is independently developed without reference to the disclosing party's confidential information.`);

  sections.push(`## 9A. PHOTOS, RECORDS, AND PRIVACY

The Client authorizes the Service Provider to create and retain operational records reasonably necessary to perform, verify, improve, or document the services, including job notes, inspection records, before-and-after photos, walkthrough photos, and issue documentation.

Photos and records shall be used for operational, quality-control, safety, dispute-resolution, training, insurance, or billing purposes and shall not be used in public marketing materials without separate Client approval. The Service Provider shall use reasonable care to avoid capturing unnecessary personal, confidential, or sensitive information.`);

  // 10. NON-SOLICITATION
  sections.push(`## 10. NON-SOLICITATION

During the term of this Agreement and for a period of twelve (12) months following its termination, neither party shall, directly or indirectly, solicit, recruit, or hire any employee or contractor of the other party who was involved in the performance of this Agreement, without the prior written consent of the other party.`);

  // 11. HEALTH AND SAFETY
  sections.push(`## 11. HEALTH AND SAFETY

The Service Provider shall comply with all applicable federal and provincial occupational health and safety legislation, including but not limited to the requirements of WorkSafeBC (or the equivalent provincial authority) and the Workplace Hazardous Materials Information System (WHMIS).

The Client shall disclose all known hazards at the service location, including the presence of hazardous materials, asbestos, biohazards, or any conditions that may pose a risk to the Service Provider's personnel.

Both parties shall cooperate in maintaining a safe working environment and shall promptly report any workplace incidents or safety concerns.

The Service Provider may refuse, pause, or reschedule work where a worker, supervisor, or manager reasonably believes the work or site condition may create an unsafe condition, exposure risk, or violation of applicable health and safety requirements. Workers retain all rights and duties provided by applicable occupational health and safety legislation, including the right to refuse unsafe work where applicable.`);

  sections.push(`## 11A. SUPPLIES, EQUIPMENT, CHEMICALS, AND SDS

Equipment shall be provided by: ${equipmentProvider}. Chemicals shall be provided by: ${chemicalProvider}.

${approvedChemicalNotes ? `Approved chemical requirements: ${approvedChemicalNotes}` : 'Only products reasonably suitable for the agreed services shall be used.'}

${restrictedChemicalNotes ? `Restricted chemicals or methods: ${restrictedChemicalNotes}` : 'The Client shall notify the Service Provider in writing of any chemical sensitivities, prohibited products, fragrance restrictions, surface restrictions, or building rules before service begins.'}

${equipmentNotes ? `Equipment notes: ${equipmentNotes}` : 'Equipment must be maintained in safe working condition and used according to manufacturer instructions.'}

${data.requiresSpecialEquipment || specialEquipmentNotes ? `Special equipment requirements: ${specialEquipmentNotes || 'Special equipment is required for part of the scope.'}` : 'Special equipment is not included unless listed in the proposal, service scope, or written change order.'}

${sdsText}

${storageText}

If the Client provides chemicals, supplies, or equipment, the Client is responsible for ensuring they are safe, suitable for the intended surfaces, properly labelled where required, and available at the scheduled service time. The Service Provider may refuse to use any client-provided chemical, supply, or equipment that appears unsafe, unsuitable, damaged, improperly labelled, or inconsistent with safe work practices.`);

  sections.push(`## 11B. SUBCONTRACTORS AND WORKER PROTECTION

The Service Provider may use employees, subcontractors, or assigned teams to perform the services, provided that the Service Provider remains responsible for coordinating the contracted services.

Where subcontractors are used, the Service Provider shall use commercially reasonable efforts to confirm required insurance, safety, and workers' compensation status where applicable. Subcontractors and workers must follow applicable site rules, safe work procedures, and occupational health and safety requirements.

The Client shall not directly instruct individual workers to perform out-of-scope, unsafe, illegal, or unauthorized work. Requests for changes must be directed to the Service Provider's authorized representative.`);

  // 12. FORCE MAJEURE
  sections.push(`## 12. FORCE MAJEURE

Neither party shall be liable for any failure or delay in the performance of its obligations under this Agreement to the extent that such failure or delay is caused by circumstances beyond its reasonable control, including but not limited to natural disasters, pandemics, epidemics, government orders or restrictions, acts of terrorism, labour disputes, or utility failures.

The affected party shall provide prompt written notice to the other party of the force majeure event and shall use reasonable efforts to mitigate its impact. If the force majeure event continues for more than sixty (60) days, either party may terminate this Agreement upon written notice.`);

  // 13. DISPUTE RESOLUTION
  sections.push(`## 13. DISPUTE RESOLUTION

The parties agree to resolve any dispute arising out of or in connection with this Agreement in the following manner:

(a) Negotiation: The parties shall first attempt to resolve the dispute through good faith negotiation within thirty (30) days of written notice of the dispute.
(b) Mediation: If negotiation is unsuccessful, the parties shall submit the dispute to mediation administered by a mutually agreed-upon mediator.
(c) Arbitration: If mediation is unsuccessful, the dispute shall be resolved by binding arbitration in accordance with the British Columbia Arbitration Act, conducted in the Province of British Columbia.

This Agreement shall be governed by and construed in accordance with the laws of the Province of British Columbia and the applicable laws of Canada, without regard to conflict of law principles.`);

  // 14. GENERAL PROVISIONS
  sections.push(`## 14. GENERAL PROVISIONS

Entire Agreement: This Agreement, together with any schedules and amendments, constitutes the entire agreement between the parties and supersedes all prior agreements, representations, and understandings.

Amendments: No amendment or modification of this Agreement shall be valid unless made in writing and signed by both parties.

Severability: If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.

Assignment: Neither party may assign or transfer this Agreement without the prior written consent of the other party, except that either party may assign this Agreement to a successor in connection with a merger, acquisition, or sale of substantially all of its assets.

Independent Contractor: The Service Provider is an independent contractor and nothing in this Agreement shall be construed as creating an employment, partnership, or agency relationship between the parties.

Notices: All notices under this Agreement shall be in writing and shall be deemed given when delivered personally, sent by email with confirmation of receipt, or sent by registered mail to the addresses set forth herein.`);

  // 15. ACCEPTANCE
  sections.push(`## 15. ACCEPTANCE

By executing this Agreement, the parties acknowledge that they have read, understood, and agree to be bound by all terms and conditions set forth herein. This Agreement may be executed in counterparts, each of which shall be deemed an original and all of which together shall constitute one and the same instrument.`);

  return sections.join('\n\n');
}
