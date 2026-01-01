/**
 * Institutional News Section
 * 
 * Placeholder for "Sistemos pranešimai".
 * Minimalist text list.
 */
export function NewsSection() {
  return (
    <section className="bg-gradient-to-b from-slate-50 to-white py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Sistemos Pranešimai
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="rounded-lg border bg-white p-8 text-center">
            <p className="text-slate-600">
              Sistemos pranešimai bus paskelbti čia netrukus.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

