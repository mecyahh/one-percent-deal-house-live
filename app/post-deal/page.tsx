"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PostDealPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      alert("You must be logged in");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("deals").insert({
      user_id: user.id,
      full_name: formData.get("full_name"),
      phone: formData.get("phone"),
      client_dob: formData.get("client_dob"),
      beneficiary_name: formData.get("beneficiary_name"),
      beneficiary_relationship: formData.get("beneficiary_relationship"),
      beneficiary_dob: formData.get("beneficiary_dob"),
      coverage: formData.get("coverage"),
      premium: formData.get("premium"),
      company: formData.get("company"),
      notes: formData.get("notes"),
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      setSuccess(true);
      e.currentTarget.reset();
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto" }}>
      <h1>Post a Deal</h1>

      {success && <p style={{ color: "green" }}>Deal submitted successfully.</p>}

      <form onSubmit={handleSubmit}>
        <input name="full_name" placeholder="Full name" required />
        <input name="phone" placeholder="Phone" required />
        <input name="client_dob" type="date" required />

        <input name="beneficiary_name" placeholder="Beneficiary name" />
        <select name="beneficiary_relationship">
          <option value="spouse">Spouse</option>
          <option value="child">Child</option>
          <option value="parent">Parent</option>
          <option value="other">Other</option>
        </select>
        <input name="beneficiary_dob" type="date" />

        <input name="coverage" placeholder="Coverage" />
        <input name="premium" placeholder="Premium" />
        <input name="company" placeholder="Company" />
        <textarea name="notes" placeholder="Notes" />

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Deal"}
        </button>
      </form>
    </div>
  );
}
