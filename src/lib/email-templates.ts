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

const APP_NAME = 'Bendruomenių Branduolys'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'https://asociacija.net')

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
                Šis email'as buvo išsiųstas automatiškai. Prašome neatsakyti į šį laišką.
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
      ${data.map(({ label, value }) => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px; width: 40%;">
            ${label}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px;">
            ${value}
          </td>
        </tr>
      `).join('')}
    </table>
  `
}

/**
 * Template: Governance Submission Notice (to CORE)
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
      { label: 'Pirmininkas', value: data.chairmanName || 'Nepriskyrimas' },
      ...(data.chairmanEmail ? [{ label: 'El. paštas', value: data.chairmanEmail }] : []),
      { label: 'Statusas', value: '<span style="color: #f59e0b; font-weight: 600;">Laukia patvirtinimo</span>' },
    ])}
    
    ${getInfoBox('Prašome peržiūrėti pateiktus valdymo atsakymus ir patvirtinti organizaciją, kai ji atitinka visus reikalavimus.', 'info')}
  `
  
  const html = getEmailTemplate(content, '#3b82f6')
  
  const text = `
Nauja bendruomenė pateikta patvirtinimui

Nauja bendruomenė pateikė valdymo atsakymus ir priėmė visus privalomus sutikimus.

Bendruomenės informacija:
- Pavadinimas: ${data.orgName}
- Subdomenas: /c/${data.orgSlug}
- Pirmininkas: ${data.chairmanName || 'Nepriskyrimas'}
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
      Sveikiname! Jūsų bendruomenė <strong style="color: #1e293b;">${data.orgName}</strong> buvo sėkmingai patvirtinta CORE komiteto.
    </p>
    
    ${getInfoBox('Dabar galite naudoti visus sistemos funkcionalumus: projektų valdymas, renginių organizavimas, nutarimų pateikimas, narių valdymas ir daugiau.', 'success')}
    
    ${getButton(dashboardUrl, 'Prisijungti prie valdymo', 'primary')}
    
    <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
      Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:<br>
      <a href="${dashboardUrl}" style="color: #3b82f6; word-break: break-all; text-decoration: underline;">${dashboardUrl}</a>
    </p>
  `
  
  const html = getEmailTemplate(content, '#10b981')
  
  const text = `
Jūsų bendruomenė patvirtinta!

Sveikiname! Jūsų bendruomenė ${data.orgName} buvo sėkmingai patvirtinta CORE komiteto.

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
  timestamp: string
}): { subject: string; html: string; text: string } {
  const subject = 'Nauja bendruomenės registracijos paraiška'
  
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Nauja bendruomenės registracijos paraiška
    </h2>
    
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Gavome naują paraišką registruoti bendruomenę platformoje.
    </p>
    
    ${getDataTable([
      { label: 'Bendruomenės pavadinimas', value: data.communityName },
      { label: 'Kontaktinis asmuo', value: data.contactPerson || 'Nenurodytas' },
      { label: 'El. paštas', value: data.email },
      { label: 'Aprašymas', value: data.description || 'Nenurodytas' },
      { label: 'Data', value: new Date(data.timestamp).toLocaleString('lt-LT') },
    ])}
    
    ${getInfoBox('Prašome peržiūrėti paraišką ir susisiekti su paraiškos pateikėju.', 'info')}
  `
  
  const html = getEmailTemplate(content, '#3b82f6')
  
  const text = `
Nauja bendruomenės registracijos paraiška

Paraiškos informacija:
- Bendruomenės pavadinimas: ${data.communityName}
- Kontaktinis asmuo: ${data.contactPerson || 'Nenurodytas'}
- El. paštas: ${data.email}
- Aprašymas: ${data.description || 'Nenurodytas'}
- Data: ${new Date(data.timestamp).toLocaleString('lt-LT')}

Prašome peržiūrėti paraišką ir susisiekti su paraiškos pateikėju.

${APP_NAME}
Lietuvos bendruomenių valdymo platforma
  `.trim()
  
  return { subject, html, text }
}

/**
 * Template: Community Registration (Confirmation to Applicant)
 */
export function getRegistrationConfirmationEmail(data: {
  communityName: string
  email: string
  onboardingLink?: string
}): { subject: string; html: string; text: string } {
  const subject = 'Jūsų paraiška gauta - Branduolys'
  
  let onboardingSection = ''
  if (data.onboardingLink) {
    onboardingSection = `
      ${getInfoBox('Jūsų paraiška buvo patvirtinta! Dabar galite pradėti onboarding procesą.', 'success')}
      
      ${getButton(data.onboardingLink, 'Pradėti onboarding', 'primary')}
      
      <p style="margin: 16px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
        Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:<br>
        <a href="${data.onboardingLink}" style="color: #3b82f6; word-break: break-all; text-decoration: underline;">${data.onboardingLink}</a>
      </p>
    `
  } else {
    onboardingSection = `
      ${getInfoBox('Peržiūrėsime jūsų paraišką ir su jumis susisieksime per pateiktą el. pašto adresą <strong>' + data.email + '</strong>.', 'info')}
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
  
  if (data.onboardingLink) {
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
 * Template: Test Email
 */
export function getTestEmail(): { subject: string; html: string; text: string } {
  const subject = 'Test Email - Branduolys'
  
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Testinis email
    </h2>
    
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Tai yra testinis email iš ${APP_NAME} sistemos.
    </p>
    
    ${getInfoBox('Jei gavote šį email\'ą, tai reiškia, kad email siuntimo sistema veikia teisingai.', 'success')}
    
    <p style="margin: 24px 0 0 0; color: #1e293b; font-size: 14px; line-height: 1.6;">
      Pagarbiai,<br>
      <strong>Branduolys komanda</strong>
    </p>
  `
  
  const html = getEmailTemplate(content, '#3b82f6')
  
  const text = `
Test Email

Tai yra testinis email iš ${APP_NAME} sistemos.

Jei gavote šį email'ą, tai reiškia, kad email siuntimo sistema veikia teisingai.

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
    
    ${getInfoBox('Jei jūs nepateikėte šios užklausos, ignoruokite šį email\'ą. Jūsų slaptažodis nebus pakeistas.', 'warning')}
    
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

Jei jūs nepateikėte šios užklausos, ignoruokite šį email'ą. Jūsų slaptažodis nebus pakeistas.

Ši nuoroda galioja 1 valandą.

${APP_NAME}
Lietuvos bendruomenių valdymo platforma
  `.trim()
  
  return { subject, html, text }
}

