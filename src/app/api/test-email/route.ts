import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

/**
 * Test Email API Route
 * 
 * Allows testing email sending functionality.
 * Can be used to resend emails that were not sent.
 */

interface TestEmailData {
  to: string
  subject?: string
  testType?: 'admin' | 'confirmation' | 'custom'
  registrationData?: {
    communityName?: string
    contactPerson?: string
    email?: string
    description?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: TestEmailData = await request.json()

    if (!data.to) {
      return NextResponse.json(
        { error: 'Trūksta el. pašto adreso (to)' },
        { status: 400 }
      )
    }

    const CORE_ADMIN_EMAIL = process.env.CORE_ADMIN_EMAIL || 'admin@branduolys.lt'

    let emailHtml = ''
    let emailText = ''
    let subject = ''

    // Determine email type
    if (data.testType === 'admin' || (!data.testType && data.registrationData)) {
      // Admin notification email
      subject = data.subject || 'Nauja bendruomenės registracijos paraiška'
      emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #1e293b; margin: 0 0 10px 0;">Nauja bendruomenės registracijos paraiška</h1>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">Paraiškos informacija</h2>
                <p style="margin: 5px 0;"><strong>Bendruomenės pavadinimas:</strong> ${data.registrationData?.communityName || 'Test Bendruomenė'}</p>
                <p style="margin: 5px 0;"><strong>Kontaktinis asmuo:</strong> ${data.registrationData?.contactPerson || 'Nenurodytas'}</p>
                <p style="margin: 5px 0;"><strong>El. paštas:</strong> ${data.registrationData?.email || data.to}</p>
                <p style="margin: 5px 0;"><strong>Aprašymas:</strong> ${data.registrationData?.description || 'Nenurodytas'}</p>
                <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date().toLocaleString('lt-LT')}</p>
              </div>
              
              <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px;">
                Prašome peržiūrėti paraišką ir susisiekti su paraiškos pateikėju.
              </p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; text-align: center; color: #64748b; font-size: 12px;">
              <p style="margin: 0;">Bendruomenių Branduolys - Lietuvos bendruomenių platforma</p>
            </div>
          </body>
        </html>
      `

      emailText = `
Nauja bendruomenės registracijos paraiška

Paraiškos informacija:
- Bendruomenės pavadinimas: ${data.registrationData?.communityName || 'Test Bendruomenė'}
- Kontaktinis asmuo: ${data.registrationData?.contactPerson || 'Nenurodytas'}
- El. paštas: ${data.registrationData?.email || data.to}
- Aprašymas: ${data.registrationData?.description || 'Nenurodytas'}
- Data: ${new Date().toLocaleString('lt-LT')}

Prašome peržiūrėti paraišką ir susisiekti su paraiškos pateikėju.
      `.trim()

    } else if (data.testType === 'confirmation') {
      // Confirmation email
      subject = data.subject || 'Jūsų paraiška gauta - Branduolys'
      emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #10b981; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Dėkojame už jūsų paraišką!</h1>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 15px 0;">Gavome jūsų paraišką registruoti bendruomenę <strong>${data.registrationData?.communityName || 'Test Bendruomenė'}</strong>.</p>
              
              <p style="margin: 15px 0;">Peržiūrėsime jūsų paraišką ir su jumis susisieksime per pateiktą el. pašto adresą <strong>${data.to}</strong>.</p>
              
              <p style="margin: 15px 0;">Jei turite klausimų, susisiekite su mumis.</p>
              
              <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px;">
                Pagarbiai,<br />
                Branduolys komanda
              </p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; text-align: center; color: #64748b; font-size: 12px;">
              <p style="margin: 0;">Bendruomenių Branduolys - Lietuvos bendruomenių platforma</p>
            </div>
          </body>
        </html>
      `

      emailText = `
Dėkojame už jūsų paraišką!

Gavome jūsų paraišką registruoti bendruomenę ${data.registrationData?.communityName || 'Test Bendruomenė'}.

Peržiūrėsime jūsų paraišką ir su jumis susisieksime per pateiktą el. pašto adresą ${data.to}.

Jei turite klausimų, susisiekite su mumis.

Pagarbiai,
Branduolys komanda
      `.trim()

    } else {
      // Custom email
      subject = data.subject || 'Test Email - Branduolys'
      emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #1e293b; margin: 0 0 10px 0;">Test Email</h1>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 15px 0;">Tai yra testinis email iš Branduolys sistemos.</p>
              <p style="margin: 15px 0;">Jei gavote šį email'ą, tai reiškia, kad email siuntimo sistema veikia teisingai.</p>
              <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px;">
                Pagarbiai,<br />
                Branduolys komanda
              </p>
            </div>
          </body>
        </html>
      `

      emailText = `
Test Email

Tai yra testinis email iš Branduolys sistemos.

Jei gavote šį email'ą, tai reiškia, kad email siuntimo sistema veikia teisingai.

Pagarbiai,
Branduolys komanda
      `.trim()
    }

    // Send email
    const result = await sendEmail({
      to: data.to,
      subject,
      html: emailHtml,
      text: emailText,
    })

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Nepavyko išsiųsti email',
          details: 'Patikrinkite serverio console log\'us'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email išsiųstas sėkmingai',
      to: data.to,
      subject
    })
  } catch (error: any) {
    console.error('Error in test-email route:', error)
    return NextResponse.json(
      { error: 'Nepavyko apdoroti užklausos', details: error.message },
      { status: 500 }
    )
  }
}

