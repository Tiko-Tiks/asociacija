import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

/**
 * API Route: Community Registration Request
 * 
 * Receives registration form data and:
 * 1. Saves to database (if applications table exists)
 * 2. Sends email notification to admin
 * 3. Sends confirmation email to applicant
 */

interface RegistrationData {
  communityName: string
  contactPerson: string
  email: string
  description: string
  timestamp: string
}

const CORE_ADMIN_EMAIL = process.env.CORE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@branduolys.lt'

export async function POST(request: NextRequest) {
  try {
    const data: RegistrationData = await request.json()

    // Validate required fields
    if (!data.communityName || !data.email) {
      return NextResponse.json(
        { error: 'Trūksta privalomų laukų' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 1. Try to save to applications table (if exists)
    try {
      const { error: insertError } = await supabase
        .from('community_applications')
        .insert({
          community_name: data.communityName,
          contact_person: data.contactPerson || null,
          email: data.email,
          description: data.description || null,
          status: 'PENDING',
          created_at: data.timestamp,
        })

      if (insertError && insertError.code !== '42P01') {
        // Table doesn't exist (42P01) is OK, other errors are logged
        console.error('Error saving application to DB:', insertError)
      }
    } catch (dbError) {
      // Table might not exist, continue anyway
      console.log('Applications table not available, skipping DB save')
    }

    // 2. Send email notification to admin
    const adminEmailHtml = `
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
              <p style="margin: 5px 0;"><strong>Bendruomenės pavadinimas:</strong> ${data.communityName}</p>
              <p style="margin: 5px 0;"><strong>Kontaktinis asmuo:</strong> ${data.contactPerson || 'Nenurodytas'}</p>
              <p style="margin: 5px 0;"><strong>El. paštas:</strong> ${data.email}</p>
              <p style="margin: 5px 0;"><strong>Aprašymas:</strong> ${data.description || 'Nenurodytas'}</p>
              <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date(data.timestamp).toLocaleString('lt-LT')}</p>
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

    const adminEmailText = `
Nauja bendruomenės registracijos paraiška

Paraiškos informacija:
- Bendruomenės pavadinimas: ${data.communityName}
- Kontaktinis asmuo: ${data.contactPerson || 'Nenurodytas'}
- El. paštas: ${data.email}
- Aprašymas: ${data.description || 'Nenurodytas'}
- Data: ${new Date(data.timestamp).toLocaleString('lt-LT')}

Prašome peržiūrėti paraišką ir susisiekti su paraiškos pateikėju.
    `.trim()

    await sendEmail({
      to: CORE_ADMIN_EMAIL,
      subject: 'Nauja bendruomenės registracijos paraiška',
      html: adminEmailHtml,
      text: adminEmailText,
    })

    // 3. Send confirmation email to applicant
    const confirmationHtml = `
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
            <p style="margin: 0 0 15px 0;">Gavome jūsų paraišką registruoti bendruomenę <strong>${data.communityName}</strong>.</p>
            
            <p style="margin: 15px 0;">Peržiūrėsime jūsų paraišką ir su jumis susisieksime per pateiktą el. pašto adresą <strong>${data.email}</strong>.</p>
            
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

    const confirmationText = `
Dėkojame už jūsų paraišką!

Gavome jūsų paraišką registruoti bendruomenę ${data.communityName}.

Peržiūrėsime jūsų paraišką ir su jumis susisieksime per pateiktą el. pašto adresą ${data.email}.

Jei turite klausimų, susisiekite su mumis.

Pagarbiai,
Branduolys komanda
    `.trim()

    await sendEmail({
      to: data.email,
      subject: 'Jūsų paraiška gauta - Branduolys',
      html: confirmationHtml,
      text: confirmationText,
    })

    return NextResponse.json({ success: true, message: 'Paraiška gauta' })
  } catch (error) {
    console.error('Error processing registration:', error)
    return NextResponse.json(
      { error: 'Nepavyko apdoroti paraiškos' },
      { status: 500 }
    )
  }
}

