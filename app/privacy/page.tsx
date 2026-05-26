import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to Flowly
        </Link>

        <h1 className="text-4xl font-semibold text-gray-900 mt-8 mb-4">
          Privacy Policy
        </h1>

        <p className="text-gray-500 mb-8">
          Last updated: May 2026
        </p>

        <div className="space-y-6 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              1. What Flowly is
            </h2>
            <p>
              Flowly is a project, task, and time tracking web application that helps users organize work, manage tasks, set deadlines, and track time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              2. Information we collect
            </h2>
            <p>
              Flowly may collect account information such as your email address and name, as well as content you create inside the app, including projects, tasks, deadlines, priorities, notes, and time tracking records.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              3. How we use your information
            </h2>
            <p>
              We use your information to provide the Flowly service, save your workspace, authenticate your account, display your tasks and projects, and improve the app experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              4. Data storage
            </h2>
            <p>
              Flowly uses Supabase for authentication and database storage. Your data is stored securely and access is controlled through user authentication and database security rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              5. Data sharing
            </h2>
            <p>
              We do not sell your personal data. Your project and task data is not shared with other users unless you explicitly invite someone to access a project.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              6. Your control
            </h2>
            <p>
              You can update, delete, or manage your tasks and projects inside the app. You may also stop using Flowly at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              7. Contact
            </h2>
            <p>
              For privacy questions, contact the Flowly team through the contact method provided by the app owner.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}