import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to Flowly
        </Link>

        <h1 className="text-4xl font-semibold text-gray-900 mt-8 mb-4">
          Terms of Service
        </h1>

        <p className="text-gray-500 mb-8">
          Last updated: May 2026
        </p>

        <div className="space-y-6 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              1. Acceptance of terms
            </h2>
            <p>
              By using Flowly, you agree to these Terms of Service. If you do not agree, you should not use the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              2. Use of Flowly
            </h2>
            <p>
              Flowly is provided to help users manage projects, tasks, deadlines, priorities, and time tracking. You agree to use the app responsibly and not misuse the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              3. User accounts
            </h2>
            <p>
              You are responsible for maintaining the security of your account and login credentials. You should not share your account with unauthorized users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              4. User content
            </h2>
            <p>
              You are responsible for the projects, tasks, notes, and other content you create in Flowly. You should not upload or store unlawful, harmful, or abusive content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              5. Availability
            </h2>
            <p>
              Flowly is provided as a web application and may change over time. We aim to keep the service available, but we cannot guarantee uninterrupted access at all times.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              6. Limitation of liability
            </h2>
            <p>
              Flowly is provided as-is. The app owner is not responsible for losses caused by misuse, service interruptions, incorrect data entry, or reliance on the app for critical decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              7. Changes to these terms
            </h2>
            <p>
              These terms may be updated from time to time. Continued use of Flowly after changes means you accept the updated terms.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}