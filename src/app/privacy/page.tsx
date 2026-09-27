import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Privacy notice | MyDriveLog",
  description: "How MyDriveLog handles instructor and learner information.",
};

export default function PrivacyPage() {
  return (
    <main data-dt="privacy-page">
      <SiteHeader mode="standalone" />

      <article data-dt="privacy-article">
        <p data-dt="privacy-eyebrow">Your information</p>
        <h1>Privacy notice</h1>
        <p data-dt="privacy-updated">Last updated 27 September 2026</p>
        <p data-dt="privacy-intro">
          MyDriveLog helps driving instructors plan lessons, take bookings and
          record what happened in each lesson. This notice explains what
          information we use to provide that service.
        </p>

        <section>
          <h2>Who runs MyDriveLog</h2>
          <p>
            Predison Limited trading as MyDriveLog is responsible for personal
            information processed by the service. For a privacy question or a
            request about your information, email{" "}
            <a href="mailto:hello@mydrivelog.co.uk">hello@mydrivelog.co.uk</a>.
          </p>
        </section>

        <section>
          <h2>Information we use</h2>
          <ul>
            <li><strong>Instructors:</strong> name, email address, sign-in details, workspace settings and contact phone number if supplied.</li>
            <li><strong>Learners:</strong> name, email address, booking details and lesson times supplied by an instructor or learner.</li>
            <li><strong>Lesson records:</strong> instructor notes, skill assessments, recaps and follow-up messages. An instructor chooses what to send to a learner; private notes are not included in a learner recap.</li>
            <li><strong>Service data:</strong> essential session cookies and technical information needed to operate and secure the website, which may include an IP address and browser details.</li>
          </ul>
          <p>
            Instructors give us their own account details and may add learner
            details. Learners may also enter their details when booking. We do
            not use MyDriveLog to access your Google Drive, Gmail or contacts.
          </p>
        </section>

        <section>
          <h2>Why we use it</h2>
          <p>
            We use instructor account details to provide the workspace under
            our agreement with the instructor. We use learner and lesson details
            to arrange lessons and keep useful teaching records, based on our
            legitimate interest in running the service instructors and learners
            ask to use. We use limited technical information to keep the service
            secure and fix faults, also based on legitimate interests. We do
            not sell personal information.
          </p>
        </section>

        <section>
          <h2>Who receives it</h2>
          <p>
            Google and Firebase handle Google sign-in if an instructor chooses
            it. Our database, website host and email delivery providers process
            information needed to run MyDriveLog. A learner receives booking
            details and any lesson recap or follow-up that the instructor
            chooses to share. Some providers may process data outside the UK; where they do,
            we use the safeguards required by UK data protection law.
          </p>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <p>
            We keep account, learner, booking and lesson records while the
            instructor uses the workspace. If an instructor asks us to close
            it, we will remove records that are no longer needed within 30
            days, except information we must keep for a legal obligation or
            an active dispute. Copies in backups may take up to 90 days to
            expire. We review technical logs and keep them only as long as
            needed for security and fault investigation.
          </p>
        </section>

        <section>
          <h2>Your choices and rights</h2>
          <p>
            You can ask to see, correct or delete your information, or object
            to or restrict certain uses. You may also have a right to receive
            a copy in a portable format. Email{" "}
            <a href="mailto:hello@mydrivelog.co.uk">hello@mydrivelog.co.uk</a>. We will
            respond within one month. You can also complain to the{" "}
            <a href="https://ico.org.uk/make-a-complaint/">Information Commissioner&apos;s Office</a>.
          </p>
        </section>

        <section>
          <h2>Changes to this notice</h2>
          <p>We will update this page when our data practices change.</p>
        </section>
      </article>
      <SiteFooter mode="standalone" />
    </main>
  );
}
