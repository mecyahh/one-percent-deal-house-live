'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type Profile = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export default function SettingsPage() {
  const [me, setMe] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function boot() {
    setLoading(true)

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes.user
    if (!user) {
      window.location.href = '/login'
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!data) {
      setLoading(false)
      return
    }

    setMe(data)
    setFirstName(data.first_name || '')
    setLastName(data.last_name || '')
    setEmail(data.email || '')
    setLoading(false)
  }

  async function saveProfile() {
    if (!me) return

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        email: email.trim() || null,
      })
      .eq('id', me.id)

    if (error) {
      setToast('Save failed')
      return
    }

    setToast('Profile updated ✅')
    boot()
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl px-5 py-4 shadow-2xl">
            <div className="text-sm font-semibold">{toast}</div>
            <button
              onClick={() => setToast(null)}
              className="mt-3 text-xs text-white/70 hover:text-white"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="ml-64 px-10 py-10 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Settings</h1>
        <p className="text-sm text-white/60 mb-8">
          Manage your profile and account preferences.
        </p>

        {/* PROFILE CARD */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>

          {/* Profile Picture */}
          <Field label="Profile Picture">
            {me?.avatar_url && (
              <img
                src={me.avatar_url}
                alt="Avatar"
                className="h-16 w-16 rounded-full mb-3 object-cover border border-white/10"
              />
            )}

            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-white/70
                file:mr-4 file:rounded-xl file:border-0
                file:bg-white/10 file:px-4 file:py-2
                file:text-sm file:font-semibold
                hover:file:bg-white/20 transition"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !me) return

                const ext = file.name.split('.').pop() || 'png'
                const path = `${me.id}.${ext}`

                const { error: uploadError } = await supabase.storage
                  .from('avatars')
                  .upload(path, file, { upsert: true })

                if (uploadError) {
                  setToast('Upload failed')
                  return
                }

                const { data } = supabase.storage
                  .from('avatars')
                  .getPublicUrl(path)

                await supabase
                  .from('profiles')
                  .update({ avatar_url: data.publicUrl })
                  .eq('id', me.id)

                setToast('Profile picture updated ✅')
                boot()
              }}
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Field label="First Name">
              <input
                className={inputCls}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Field>

            <Field label="Last Name">
              <input
                className={inputCls}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Field>

            <Field label="Email">
              <input
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </div>

          <button onClick={saveProfile} className={saveBtn}>
            Save Profile
          </button>
        </div>

        {/* ACCOUNT */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold mb-4">Account</h2>

          <button
            onClick={logout}
            className="rounded-2xl bg-red-600/80 hover:bg-red-600 transition px-5 py-3 text-sm font-semibold"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- UI Helpers ---------- */

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-[11px] text-white/55 mb-2">{label}</div>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/20 focus:bg-white/10'

const saveBtn =
  'mt-6 rounded-2xl bg-green-600 hover:bg-green-500 transition px-5 py-3 text-sm font-semibold'
