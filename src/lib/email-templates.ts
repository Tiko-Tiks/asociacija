/**
 * Email Templates - Institutional Design System
 *
 * Follows platform design philosophy:
 * - Clean, authoritative, institutional
 * - No flashy animations, no marketing fluff
 * - Professional, trustworthy appearance
 *
 * Colors:
 * - Primary: #3b82f6 (blue)
 * - Background: #ffffff (white)
 * - Text: #1e293b (slate-900)
 * - Muted: #64748b (slate-500)
 * - Border: #e2e8f0 (slate-200)
 * - Success: #10b981 (green)
 */

import { getAppUrl } from './app-url'
import { toVocative, getFirstName } from './vocative'

const APP_NAME = 'Bendruomenių Branduolys'
const APP_URL = getAppUrl()

/**
 * Base email template wrapper
 */
function getEmailTemplate(content: string, headerColor: string = '#3b82f6'): string {
  return `
<!DOCTYPE html>
<html lang="lt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6; color: #1e293b;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc; padding: 20px;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${headerColor} 0%, ${headerColor}dd 100%); padding: 32px 24px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                ${APP_NAME}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                <strong style="color: #1e293b;">${APP_NAME}</strong><br>
                Lietuvos bendruomenių valdymo platforma
              </p>
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px;">
                Šis el. laiškas buvo išsiųstas automatiškai. Prašome neatsakyti į šį laišką.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Button component for emails
 */
function getButton(href: string, text: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const bgColor = variant === 'primary' ? '#3b82f6' : '#64748b'
  const hoverColor = variant === 'primary' ? '#2563eb' : '#475569'

  return `
    <table role="presentation" style="width: 100%; margin: 24px 0;">
      <tr>
        <td align="center" style="padding: 0;">
          <a href="${href}" style="display: inline-block; background-color: ${bgColor}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px; text-align: center; transition: background-color 0.2s;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `
}

/**
 * Info box component
 */
function getInfoBox(content: string, type: 'info' | 'success' | 'warning' = 'info'): string {
  const colors = {
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    success: { bg: '#f0fdf4', border: '#10b981', text: '#047857' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  }

  const color = colors[type]

  return `
    <div style="background-color: ${color.bg}; border-left: 4px solid ${color.border}; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: ${color.text}; font-size: 14px; line-height: 1.6;">
        ${content}
      </p>
    </div>
  `
}

/**
 * Data table component
 */
function getDataTable(data: Array<{ label: string; value: string }>): string {
  return `
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 6px; overflow: hidden;">
      ${data
        .map(
          ({ label, value }) => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px; width: 40%;">
            ${label}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px;">
            ${value}
          </td>
        </tr>
      `
        )
        .join('')}
    </table>
  `
}

/**
 * Template: Governance Submission Notice (to Platforma)
 */
export function getGovernanceSubmissionEmail(data: {
  orgName: string
  orgSlug: string
  chairmanName: string | null
  chairmanEmail: string | null
}): { subject: string; html: string; text: string } {
  const subject = 'Nauja bendruomenė pateikta patvirtinimui'

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Nauja bendruomenė pateikta patvirtinimui
    </h2>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Nauja bendruomenė pateikė valdymo atsakymus ir priėmė visus privalomus sutikimus.
    </p>

    ${getDataTable([
      { label: 'Pavadinimas', value: data.orgName },
      { label: 'Subdomenas', value: `/c/${data.orgSlug}` },
      { label: 'Pirmininkas', value: data.chairmanName || 'Nepriskirtas' },
      ...(data.chairmanEmail ? [{ label: 'El. paštas', value: data.chairmanEmail }] : []),
      { label: 'Statusas', value: '<span style="color: #f59e0b; font-weight: 600;">Laukia patvirtinimo</span>' },
    ])}

    ${getInfoBox(
      'Prašome peržiūrėti pateiktus valdymo atsakymus ir patvirtinti organizaciją, kai ji atitinka visus reikalavimus.',
      'info'
    )}
  `

  const html = getEmailTemplate(content, '#3b82f6')

  const text = `
Nauja bendruomenė pateikta patvirtinimui

Nauja bendruomenė pateikė valdymo atsakymus ir priėmė visus privalomus sutikimus.

Bendruomenės informacija:
- Pavadinimas: ${data.orgName}
- Subdomenas: /c/${data.orgSlug}
- Pirmininkas: ${data.chairmanName || 'Nepriskirtas'}
${data.chairmanEmail ? `- El. paštas: ${data.chairmanEmail}` : ''}
- Statusas: Laukia patvirtinimo

Prašome peržiūrėti pateiktus valdymo atsakymus ir patvirtinti organizaciją.

${APP_NAME}
Lietuvos bendruomenių valdymo platforma
  `.trim()

  return { subject, html, text }
}

/**
 * Template: Org Activated (to Chairman)
 */
export function getOrgActivatedEmail(data: {
  orgName: string
  orgSlug: string
  chairmanEmail: string
  chairmanName: string | null
}): { subject: string; html: string; text: string } {
  const subject = 'Jūsų bendruomenė patvirtinta'
  const dashboardUrl = `${APP_URL}/dashboard/${data.orgSlug}`

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Jūsų bendruomenė patvirtinta!
    </h2>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Sveikiname! Jūsų bendruomenė <strong style="color: #1e293b;">${data.orgName}</strong> buvo sėkmingai patvirtinta Platformos.
    </p>

    ${getInfoBox(
      'Dabar galite naudoti visus sistemos funkcionalumus: projektų valdymas, renginių organizavimas, nutarimų pateikimas, narių valdymas ir daugiau.',
      'success'
    )}

    ${getButton(dashboardUrl, 'Prisijungti prie valdymo', 'primary')}

    <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
      Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:<br>
      <a href="${dashboardUrl}" style="color: #3b82f6; word-break: break-all; text-decoration: underline;">${dashboardUrl}</a>
    </p>
  `

  const html = getEmailTemplate(content, '#10b981')

  const text = `
Jūsų bendruomenė patvirtinta!

Sveikiname! Jūsų bendruomenė ${data.orgName} buvo sėkmingai patvirtinta Platformos.

Dabar galite naudoti visus sistemos funkcionalumus.

Prisijungti prie valdymo: ${dashboardUrl}

${APP_NAME}
Lietuvos bendruomenių valdymo platforma
  `.trim()

  return { subject, html, text }
}

/**
 * Template: Community Registration (Admin Notification)
 */
export function getRegistrationAdminEmail(data: {
  communityName: string
  contactPerson: string | null
  email: string
  description: string | null
  registrationNumber?: string | null
  address?: string | null
  usagePurpose?: string | null
  timestamp: string
}): { subject: string; html: string; text: string } {
  const subject = 'Nauja bendruomenės registracijos paraiška'

  const tableData = [
    { label: 'Bendruomenės pavadinimas', value: data.communityName },
    { label: 'Kontaktinis asmuo', value: data.contactPerson || 'Nenurodytas' },
    { label: 'El. paštas', value: data.email },
  ]

  if (data.registrationNumber) {
    tableData.push({ label: 'Registracijos numeris', value: data.registrationNumber })
  }
  if (data.address) {
    tableData.push({ label: 'Adresas', value: data.address })
  }
  if (data.usagePurpose) {
    tableData.push({ label: 'Kur bus naudojama', value: data.usagePurpose })
  }

  tableData.push(
    { label: 'Aprašymas', value: data.description || 'Nenurodytas' },
    { label: 'Data', value: new Date(data.timestamp).toLocaleString('lt-LT') }
  )

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Nauja bendruomenės registracijos paraiška
    </h2>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Gavome naują paraišką registruoti bendruomenę platformoje.
    </p>

    ${getDataTable(tableData)}

    ${getInfoBox('Prašome peržiūrėti paraišką ir susisiekti su paraiškos pateikėju.', 'info')}
  `

  const html = getEmailTemplate(content, '#3b82f6')

  let textData = `
Nauja bendruomenės registracijos paraiška

Paraiškos informacija:
- Bendruomenės pavadinimas: ${data.communityName}
- Kontaktinis asmuo: ${data.contactPerson || 'Nenurodytas'}
- El. paštas: ${data.email}
`

  if (data.registrationNumber) {
    textData += `- Registracijos numeris: ${data.registrationNumber}\n`
  }
  if (data.address) {
    textData += `- Adresas: ${data.address}\n`
  }
  if (data.usagePurpose) {
    textData += `- Kur bus naudojama: ${data.usagePurpose}\n`
  }

  textData += `- Aprašymas: ${data.description || 'Nenurodytas'}
- Data: ${new Date(data.timestamp).toLocaleString('lt-LT')}

Prašome peržiūrėti paraišką ir susisiekti su paraiškos pateikėju.

${APP_NAME}
Lietuvos bendruomenių valdymo platforma`

  const text = textData.trim()

  return { subject, html, text }
}

/**
 * Template: Community Registration (Confirmation to Applicant)
 */
export function getRegistrationConfirmationEmail(data: {
  communityName: string
  email: string
  onboardingLink?: string
  password?: string
}): { subject: string; html: string; text: string } {
  const subject = 'Jūsų paraiška gauta - Branduolys'

  let onboardingSection = ''
  if (data.onboardingLink && data.password) {
    onboardingSection = `
      ${getInfoBox('Jūsų paskyra sukurta! Dabar galite pradėti onboarding procesą.', 'success')}

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">Jūsų prisijungimo duomenys:</p>
        <p style="margin: 0 0 4px 0; color: #475569; font-size: 14px;"><strong>El. paštas:</strong> ${data.email}</p>
        <p style="margin: 0; color: #475569; font-size: 14px;"><strong>Slaptažodis:</strong> <code style="background-color: #ffffff; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;">${data.password}</code></p>
        <p style="margin: 12px 0 0 0; color: #64748b; font-size: 12px;">Svarbu: išsaugokite šiuos duomenis. Rekomenduojame pakeisti slaptažodį po pirmo prisijungimo.</p>
      </div>

      ${getButton(data.onboardingLink, 'Pradėti onboarding', 'primary')}

      <p style="margin: 16px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
        Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:<br>
        <a href="${data.onboardingLink}" style="color: #3b82f6; word-break: break-all; text-decoration: underline;">${data.onboardingLink}</a>
      </p>
    `
  } else if (data.onboardingLink) {
    onboardingSection = `
      ${getInfoBox('Dabar galite užpildyti likusius duomenis ir užbaigti registraciją.', 'info')}

      ${getButton(data.onboardingLink, 'Užpildyti onboarding duomenis', 'primary')}

      <p style="margin: 16px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
        Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:<br>
        <a href="${data.onboardingLink}" style="color: #3b82f6; word-break: break-all; text-decoration: underline;">${data.onboardingLink}</a>
      </p>
      <p style="margin: 12px 0 0 0; color: #64748b; font-size: 12px;">
        Ši nuoroda galioja 7 dienas. Jei nuoroda nebegalioja, susisiekite su mumis.
      </p>
    `
  } else {
    onboardingSection = `
      ${getInfoBox(
        `Peržiūrėsime jūsų paraišką ir su jumis susisieksime per pateiktą el. pašto adresą <strong>${data.email}</strong>.`,
        'info'
      )}
    `
  }

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Dėkojame už jūsų paraišką!
    </h2>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Gavome jūsų paraišką registruoti bendruomenę <strong style="color: #1e293b;">${data.communityName}</strong>.
    </p>

    ${onboardingSection}

    <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
      Jei turite klausimų, susisiekite su mumis.
    </p>

    <p style="margin: 24px 0 0 0; color: #1e293b; font-size: 14px; line-height: 1.6;">
      Pagarbiai,<br>
      <strong>Branduolys komanda</strong>
    </p>
  `

  const html = getEmailTemplate(content, '#10b981')

  let textContent = `
Dėkojame už jūsų paraišką!

Gavome jūsų paraišką registruoti bendruomenę ${data.communityName}.
`

  if (data.onboardingLink && data.password) {
    textContent += `
Jūsų paskyra sukurta! Dabar galite pradėti onboarding procesą.

Prisijungimo duomenys:
- El. paštas: ${data.email}
- Slaptažodis: ${data.password}

Svarbu: išsaugokite šiuos duomenis. Rekomenduojame pakeisti slaptažodį po pirmo prisijungimo.

Pradėti onboarding: ${data.onboardingLink}
`
  } else if (data.onboardingLink) {
    textContent += `
Jūsų paraiška buvo patvirtinta! Dabar galite pradėti onboarding procesą.

Pradėti onboarding: ${data.onboardingLink}
`
  } else {
    textContent += `
Peržiūrėsime jūsų paraišką ir su jumis susisieksime per pateiktą el. pašto adresą ${data.email}.
`
  }

  textContent += `
Jei turite klausimų, susisiekite su mumis.

Pagarbiai,
Branduolys komanda

${APP_NAME}
Lietuvos bendruomenių valdymo platforma
  `.trim()

  return { subject, html, text: textContent }
}

/**
 * Template: Onboarding Draft Saved
 */
export function getOnboardingDraftSavedEmail(data: {
  orgName: string
  continueLink: string
}): { subject: string; html: string; text: string } {
  const subject = 'Onboarding juodraštis išsaugotas'

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Jūsų onboarding juodraštis išsaugotas
    </h2>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Jūsų onboarding duomenys organizacijai <strong style="color: #1e293b;">${data.orgName}</strong> buvo išsaugoti kaip juodraštis.
    </p>

    ${getInfoBox('Galite grįžti bet kada ir tęsti užpildymą. Duomenys bus išsaugoti.', 'info')}

    ${getButton(data.continueLink, 'Tęsti onboarding', 'primary')}

    <p style="margin: 16px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
      Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:<br>
      <a href="${data.continueLink}" style="color: #3b82f6; word-break: break-all; text-decoration: underline;">${data.continueLink}</a>
    </p>

    <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
      Primename: organizacija bus aktyvuota tik po to, kai užbaigsite visus onboarding etapus ir pateiksite duomenis admin validacijai.
    </p>
  `

  const html = getEmailTemplate(content, '#3b82f6')

  const text = `
Onboarding juodraštis išsaugotas

Jūsų onboarding duomenys organizacijai ${data.orgName} buvo išsaugoti kaip juodraštis.

Galite grįžti bet kada ir tęsti užpildymą. Duomenys bus išsaugoti.

Tęsti onboarding: ${data.continueLink}

Primename: organizacija bus aktyvuota tik po to, kai užbaigsite visus onboarding etapus ir pateiksite duomenis admin validacijai.

${APP_NAME}
Lietuvos bendruomenių valdymo platforma
  `.trim()

  return { subject, html, text }
}

/**
 * Template: Test Email
 */
export function getTestEmail(): { subject: string; html: string; text: string } {
  const subject = 'Testinis el. laiškas - Branduolys'

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Testinis el. laiškas
    </h2>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Tai yra testinis el. laiškas iš ${APP_NAME} sistemos.
    </p>

    ${getInfoBox('Jei gavote šį el. laišką, tai reiškia, kad el. laiškų siuntimo sistema veikia teisingai.', 'success')}

    <p style="margin: 24px 0 0 0; color: #1e293b; font-size: 14px; line-height: 1.6;">
      Pagarbiai,<br>
      <strong>Branduolys komanda</strong>
    </p>
  `

  const html = getEmailTemplate(content, '#3b82f6')

  const text = `
Testinis el. laiškas

Tai yra testinis el. laiškas iš ${APP_NAME} sistemos.

Jei gavote šį el. laišką, tai reiškia, kad el. laiškų siuntimo sistema veikia teisingai.

Pagarbiai,
Branduolys komanda

${APP_NAME}
Lietuvos bendruomenių valdymo platforma
  `.trim()

  return { subject, html, text }
}

/**
 * Template: Password Reset Email
 *
 * Note: This template is for custom password reset flow.
 * Currently, we use Supabase's built-in password reset which sends emails automatically.
 * To use this template, you need to implement custom password reset flow.
 */
export function getPasswordResetEmail(data: {
  email: string
  resetUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'Slaptažodžio atkūrimas - Branduolys'

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Slaptažodžio atkūrimas
    </h2>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Gavome užklausą atkurti jūsų slaptažodį. Spauskite mygtuką žemiau, kad nustatytumėte naują slaptažodį.
    </p>

    ${getInfoBox('Jei jūs nepateikėte šios užklausos, ignoruokite šį el. laišką. Jūsų slaptažodis nebus pakeistas.', 'warning')}

    ${getButton(data.resetUrl, 'Atkurti slaptažodį', 'primary')}

    <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
      Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:<br>
      <a href="${data.resetUrl}" style="color: #3b82f6; word-break: break-all; text-decoration: underline;">${data.resetUrl}</a>
    </p>

    <p style="margin: 24px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.6;">
      Ši nuoroda galioja 1 valandą.
    </p>
  `

  const html = getEmailTemplate(content, '#3b82f6')

  const text = `
Slaptažodžio atkūrimas - Branduolys

Gavome užklausą atkurti jūsų slaptažodį.

Atkurti slaptažodį: ${data.resetUrl}

Jei jūs nepateikėte šios užklausos, ignoruokite šį el. laišką. Jūsų slaptažodis nebus pakeistas.

Ši nuoroda galioja 1 valandą.

${APP_NAME}
Lietuvos bendruomenių valdymo platforma
  `.trim()

  return { subject, html, text }
}

/**
 * Template: Member Registration Confirmation
 */
export function getMemberRegistrationEmail(data: {
  orgName: string
  orgSlug: string
  requiresApproval: boolean
  approvalType: string
  firstName: string | null
}): { subject: string; html: string; text: string } {
  const subject = data.requiresApproval
    ? 'Jūsų prašymas tapti nariu gautas'
    : 'Sveiki atvykę į bendruomenę!'

  const dashboardUrl = `${APP_URL}/dashboard/${data.orgSlug}`
  const loginUrl = `${APP_URL}/login?redirect=/dashboard/${data.orgSlug}`

  let approvalMessage = ''
  if (data.requiresApproval) {
    if (data.approvalType === 'chairman') {
      approvalMessage =
        'Jūsų prašymas bus peržiūrėtas bendruomenės pirmininko. Kai jūsų narystė bus patvirtinta, gausite patvirtinimo el. laišką.'
    } else if (data.approvalType === 'board') {
      approvalMessage =
        'Jūsų prašymas bus peržiūrėtas bendruomenės valdybos. Kai jūsų narystė bus patvirtinta, gausite patvirtinimo el. laišką.'
    } else {
      approvalMessage =
        'Jūsų prašymas bus peržiūrėtas. Kai jūsų narystė bus patvirtinta, gausite patvirtinimo el. laišką.'
    }
  }

  const passwordHelp = `Jei dar neturite slaptažodžio, atsidarykite <a href="${loginUrl}" style="color: #3b82f6; text-decoration: underline;">prisijungimo puslapį</a> ir pasirinkite „Pamiršau slaptažodį“.`

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      ${data.requiresApproval ? 'Jūsų prašymas tapti nariu gautas' : 'Sveiki atvykę į bendruomenę!'}
    </h2>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      ${data.firstName ? `Sveiki, ${toVocative(data.firstName)}!` : 'Sveiki!'}
    </p>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      ${
        data.requiresApproval
          ? `Dėkojame už jūsų prašymą tapti <strong style="color: #1e293b;">${data.orgName}</strong> bendruomenės nariu.`
          : `Sveikiname! Jūs tapote <strong style="color: #1e293b;">${data.orgName}</strong> bendruomenės nariu.`
      }
    </p>

    ${
      data.requiresApproval
        ? getInfoBox(approvalMessage, 'info')
        : getInfoBox('Dabar galite prisijungti ir naudotis visais sistemos funkcionalumais.', 'success')
    }

    ${getInfoBox(passwordHelp, 'info')}

    ${
      data.requiresApproval
        ? getButton(loginUrl, 'Prisijungti', 'secondary')
        : getButton(dashboardUrl, 'Prisijungti prie bendruomenės', 'primary')
    }

    <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
      ${
        data.requiresApproval
          ? 'Jei turite klausimų, susisiekite su bendruomenės administracija.'
          : 'Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:<br>' +
            `<a href="${dashboardUrl}" style="color: #3b82f6; word-break: break-all; text-decoration: underline;">${dashboardUrl}</a>`
      }
    </p>
  `

  const html = getEmailTemplate(content, data.requiresApproval ? '#3b82f6' : '#10b981')

  const text = `
${data.requiresApproval ? 'Jūsų prašymas tapti nariu gautas' : 'Sveiki atvykę į bendruomenę!'}

${data.firstName ? `Sveiki, ${toVocative(data.firstName)}!` : 'Sveiki!'}

${
  data.requiresApproval
    ? `Dėkojame už jūsų prašymą tapti ${data.orgName} bendruomenės nariu.`
    : `Sveikiname! Jūs tapote ${data.orgName} bendruomenės nariu.`
}

${data.requiresApproval ? approvalMessage : 'Dabar galite prisijungti ir naudotis visais sistemos funkcionalumais.'}

Jei dar neturite slaptažodžio, eikite į prisijungimo puslapį ir pasirinkite „Pamiršau slaptažodį“: ${loginUrl}

${data.requiresApproval ? `Prisijungti: ${loginUrl}` : `Prisijungti prie bendruomenės: ${dashboardUrl}`}

${APP_NAME}
Lietuvos bendruomenių valdymo platforma
  `.trim()

  return { subject, html, text }
}

/**
 * Template: Member Registration Owner Notification
 */
export function getMemberRegistrationOwnerNotificationEmail(data: {
  orgName: string
  orgSlug: string
  memberEmail: string
  memberName: string
}): { subject: string; html: string; text: string } {
  const subject = 'Naujas nario prašymas'

  const membersUrl = `${APP_URL}/dashboard/${data.orgSlug}/members`

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Naujas nario prašymas
    </h2>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Gavote naują prašymą tapti <strong style="color: #1e293b;">${data.orgName}</strong> bendruomenės nariu.
    </p>

    ${getDataTable([
      { label: 'Nario vardas', value: data.memberName },
      { label: 'El. paštas', value: data.memberEmail },
    ])}

    ${getInfoBox('Prašome peržiūrėti prašymą ir patvirtinti arba atmesti narystę.', 'info')}

    ${getButton(membersUrl, 'Peržiūrėti narius', 'primary')}

    <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
      Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:<br>
      <a href="${membersUrl}" style="color: #3b82f6; word-break: break-all; text-decoration: underline;">${membersUrl}</a>
    </p>
  `

  const html = getEmailTemplate(content, '#3b82f6')

  const text = `
Naujas nario prašymas

Gavote naują prašymą tapti ${data.orgName} bendruomenės nariu.

Nario informacija:
- Vardas: ${data.memberName}
- El. paštas: ${data.memberEmail}

Prašome peržiūrėti prašymą ir patvirtinti arba atmesti narystę.

Peržiūrėti narius: ${membersUrl}

${APP_NAME}
Lietuvos bendruomenių valdymo platforma
  `.trim()

  return { subject, html, text }
}

/**
 * Template: Board Member Assigned Notification
 */
export function getBoardMemberAssignedEmail(data: {
  fullName: string
  orgName: string
  termStart: string
  termEnd: string
}): { subject: string; html: string; text: string } {
  const subject = `Jūs esate paskirtas valdybos nariu - ${data.orgName}`

  // Format dates for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Jūs esate paskirtas valdybos/tarybos nariu
    </h2>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Sveiki, <strong style="color: #1e293b;">${toVocative(getFirstName(data.fullName))}</strong>!
    </p>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Jūs buvote paskirtas <strong style="color: #1e293b;">${data.orgName}</strong> bendruomenės valdybos/tarybos nariu.
    </p>

    ${getDataTable([
      { label: 'Bendruomenė', value: data.orgName },
      { label: 'Pareigos', value: 'Valdybos/Tarybos narys' },
      { label: 'Kadencijos pradžia', value: formatDate(data.termStart) },
      { label: 'Kadencijos pabaiga', value: formatDate(data.termEnd) },
    ])}

    ${getInfoBox(
      'Prisijungę prie sistemos matysite savo pareigas ir galėsite dalyvauti valdybos posėdžiuose bei balsavimuose.',
      'success'
    )}

    ${getButton(APP_URL, 'Prisijungti prie sistemos', 'primary')}

    <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
      Jei turite klausimų, susisiekite su bendruomenės pirmininku.
    </p>

    <p style="margin: 24px 0 0 0; color: #1e293b; font-size: 14px; line-height: 1.6;">
      Pagarbiai,<br>
      <strong>${data.orgName} administracija</strong>
    </p>
  `

  const html = getEmailTemplate(content, '#10b981')

  const text = `
Jūs esate paskirtas valdybos/tarybos nariu

Sveiki, ${toVocative(getFirstName(data.fullName))}!

Jūs buvote paskirtas ${data.orgName} bendruomenės valdybos/tarybos nariu.

Informacija:
- Bendruomenė: ${data.orgName}
- Pareigos: Valdybos/Tarybos narys
- Kadencijos pradžia: ${formatDate(data.termStart)}
- Kadencijos pabaiga: ${formatDate(data.termEnd)}

Prisijungę prie sistemos matysite savo pareigas ir galėsite dalyvauti valdybos posėdžiuose bei balsavimuose.

Prisijungti: ${APP_URL}

Jei turite klausimų, susisiekite su bendruomenės pirmininku.

Pagarbiai,
${data.orgName} administracija

${APP_NAME}
Lietuvos bendruomenių valdymo platforma
  `.trim()

  return { subject, html, text }
}
