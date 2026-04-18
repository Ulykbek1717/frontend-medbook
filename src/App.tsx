import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { isApiHttpError, medBookApi, setUnauthorizedHandler } from './lib/medbookApi'
import './App.css'

type Role = 'client' | 'doctor' | 'admin'
type Screen = 'login' | 'dashboard'
type AuthMode = 'login' | 'register'
type NavTab =
  | 'appointments'
  | 'doctors'
  | 'schedule'
  | 'patients'
  | 'notes'
  | 'profile'
  | 'applications'
  | 'insights'
  | 'support'
  | 'directory'
type DashboardOverlay = 'settings' | 'notifications' | null
type ToastTone = 'success' | 'error' | 'info'

type DoctorCard = {
  id: string
  name: string
  title: string
  clinicName: string
  consultationFee: string
  experienceYears: string
  availableToday: boolean
  rating: string
  reviews: string
  tags: string[]
}

type AppointmentItem = {
  id: string
  title: string
  detail: string
  status: string
  time: string
  rawStatus: string
}

type PatientItem = {
  id: string
  name: string
  subtitle: string
}

type DoctorApplicationItem = {
  id: string
  fullName: string
  email: string
  phone: string
  specialization: string
  clinicName: string
  status: string
  rawStatus: string
  address: string
  consultationFee: string
  experienceYears: string
  licenseNumber: string
  documentsUrl: string
  createdAt: string
}

type ServiceResult = {
  title: string
  payload: unknown
}

const weekDays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

const roleLabels: Record<Role, string> = {
  client: 'Client',
  doctor: 'Doctor',
  admin: 'Admin',
}

const roleTabs: Record<Role, NavTab[]> = {
  client: ['doctors', 'appointments', 'notes', 'insights', 'support', 'profile'],
  doctor: ['doctors', 'appointments', 'patients', 'notes', 'schedule', 'insights', 'support', 'profile'],
  admin: ['applications', 'insights', 'directory', 'support', 'profile'],
}

function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [role, setRole] = useState<Role>('doctor')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [activeTab, setActiveTab] = useState<NavTab>('appointments')
  const [email, setEmail] = useState('dr.sterling@clinic.com')
  const [password, setPassword] = useState('password')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [consultationFee, setConsultationFee] = useState('20000')
  const [experienceYears, setExperienceYears] = useState('5')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [documentsUrl, setDocumentsUrl] = useState('')
  const [displayName, setDisplayName] = useState('Dr. Sterling')
  const [token, setToken] = useState('')
  const [connectionMessage, setConnectionMessage] = useState('Checking backend...')
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [dashboardError, setDashboardError] = useState('')
  const [dashboardSuccess, setDashboardSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)
  const [actionId, setActionId] = useState('')
  const [doctors, setDoctors] = useState<DoctorCard[]>([])
  const [clientAppointments, setClientAppointments] = useState<AppointmentItem[]>([])
  const [doctorAppointments, setDoctorAppointments] = useState<AppointmentItem[]>([])
  const [doctorPatients, setDoctorPatients] = useState<PatientItem[]>([])
  const [doctorApplications, setDoctorApplications] = useState<DoctorApplicationItem[]>([])
  const [selectedApplicationId, setSelectedApplicationId] = useState('')
  const [selectedApplicationDetail, setSelectedApplicationDetail] = useState<DoctorApplicationItem | null>(null)
  const [isLoadingApplicationDetail, setIsLoadingApplicationDetail] = useState(false)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [doctorNotes, setDoctorNotes] = useState<Record<string, string>>({})
  const [doctorPersonalNote, setDoctorPersonalNote] = useState('')
  const [appointmentNoteExists, setAppointmentNoteExists] = useState<Record<string, boolean>>({})
  const [bookingDoctorId, setBookingDoctorId] = useState('')
  const [bookingDate, setBookingDate] = useState(nextDate())
  const [bookingTime, setBookingTime] = useState('10:00')
  const [bookingNotes, setBookingNotes] = useState('First consultation')
  const [selectedClientAppointmentId, setSelectedClientAppointmentId] = useState('')
  const [noteLoadingId, setNoteLoadingId] = useState('')
  const [isLoadingClientNotes, setIsLoadingClientNotes] = useState(false)
  const [isLoadingDoctorPersonalNote, setIsLoadingDoctorPersonalNote] = useState(false)
  const [isSavingDoctorPersonalNote, setIsSavingDoctorPersonalNote] = useState(false)
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const date = new Date()
    date.setDate(1)
    return date
  })
  const [activeOverlay, setActiveOverlay] = useState<DashboardOverlay>(null)
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null)
  const [serviceResult, setServiceResult] = useState<ServiceResult | null>(null)
  const [serviceLoadingId, setServiceLoadingId] = useState('')
  const [complaintSubject, setComplaintSubject] = useState('Service question')
  const [complaintMessage, setComplaintMessage] = useState('Please review this request.')
  const [chatMessage, setChatMessage] = useState('Hello, I have a follow-up question.')
  const [preVisitSymptoms, setPreVisitSymptoms] = useState('Headache and fatigue')
  const [preVisitMedications, setPreVisitMedications] = useState('No regular medication')
  const [clinicDraftName, setClinicDraftName] = useState('MedBook Clinic')
  const [clinicDraftCity, setClinicDraftCity] = useState('Almaty')
  const [specializationDraftName, setSpecializationDraftName] = useState('Therapy')

  useEffect(() => {
    medBookApi
      .health()
      .then((result) => {
        setConnectionMessage(result.status || 'Backend connected')
      })
      .catch(() => {
        setConnectionMessage('Backend reachable only after Go API start')
      })
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
      setAuthError('Session expired. Please sign in again.')
      setAuthSuccess('')
      setDashboardError('')
      setDashboardSuccess('')
      setScreen('login')
    })

    return () => {
      setUnauthorizedHandler(undefined)
    }
  }, [])

  useEffect(() => {
    const savedToken = window.localStorage.getItem('medbook_token') || ''
    const savedRole = window.localStorage.getItem('medbook_role')

    if (!savedToken) {
      return
    }

    const parsedRole: Role = savedRole === 'client' ? 'client' : savedRole === 'admin' ? 'admin' : 'doctor'
    setToken(savedToken)
    setRole(parsedRole)
    setScreen('dashboard')
    void loadDashboard(savedToken, parsedRole)
  }, [])

  useEffect(() => {
    if (doctorAppointments.length > 0 && !selectedAppointmentId) {
      setSelectedAppointmentId(doctorAppointments[0].id)
    }
  }, [doctorAppointments, selectedAppointmentId])

  useEffect(() => {
    if (clientAppointments.length > 0 && !selectedClientAppointmentId) {
      setSelectedClientAppointmentId(clientAppointments[0].id)
    }
  }, [clientAppointments, selectedClientAppointmentId])

  useEffect(() => {
    if (doctorApplications.length > 0 && !selectedApplicationId) {
      setSelectedApplicationId(doctorApplications[0].id)
    }
  }, [doctorApplications, selectedApplicationId])

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timeout = window.setTimeout(() => {
      setToast(null)
    }, 2400)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [toast])

  useEffect(() => {
    if (role !== 'admin' || activeTab !== 'applications' || !token || !selectedApplicationId) {
      return
    }

    let cancelled = false

    const loadApplicationDetail = async () => {
      setIsLoadingApplicationDetail(true)

      try {
        const response = await medBookApi.getAdminDoctorApplication(token, selectedApplicationId)
        const detail = normalizeDoctorApplication(response)

        if (!cancelled) {
          setSelectedApplicationDetail(detail || null)
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setSelectedApplicationDetail(
            doctorApplications.find((application) => application.id === selectedApplicationId) || null,
          )
          setDashboardError(getErrorMessage(error, 'Failed to load application details'))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingApplicationDetail(false)
        }
      }
    }

    void loadApplicationDetail()

    return () => {
      cancelled = true
    }
  }, [role, activeTab, token, selectedApplicationId, doctorApplications])

  const selectedDoctorAppointment = useMemo(
    () => doctorAppointments.find((item) => item.id === selectedAppointmentId),
    [doctorAppointments, selectedAppointmentId],
  )

  const selectedClientAppointment = useMemo(
    () => clientAppointments.find((item) => item.id === selectedClientAppointmentId),
    [clientAppointments, selectedClientAppointmentId],
  )

  const clientAppointmentsWithNotes = useMemo(
    () =>
      clientAppointments.filter(
        (item) => appointmentNoteExists[item.id] || (doctorNotes[item.id] || '').trim().length > 0,
      ),
    [clientAppointments, appointmentNoteExists, doctorNotes],
  )

  const selectedClientNoteAppointment = useMemo(
    () =>
      clientAppointmentsWithNotes.find((item) => item.id === selectedClientAppointmentId) ||
      clientAppointmentsWithNotes[0],
    [clientAppointmentsWithNotes, selectedClientAppointmentId],
  )

  const calendarTitle = useMemo(() => formatMonthYear(calendarCursor), [calendarCursor])
  const calendarRows = useMemo(() => buildCalendarRows(calendarCursor), [calendarCursor])

  const activeTabLabel = useMemo(() => {
    if (activeTab === 'appointments') return role === 'doctor' ? 'Doctor Appointments' : 'Appointments'
    if (activeTab === 'doctors') return 'Doctors'
    if (activeTab === 'schedule') return 'Schedule'
    if (activeTab === 'patients') return 'Patients'
    if (activeTab === 'notes') return 'Notes'
    if (activeTab === 'applications') return 'Doctor Applications'
    if (activeTab === 'insights') return role === 'admin' ? 'Operations' : 'Visit Workspace'
    if (activeTab === 'support') return 'Support'
    if (activeTab === 'directory') return 'Directory'
    return 'Profile'
  }, [activeTab, role])

  const allowedTabs = useMemo(() => roleTabs[role], [role])

  const navItems = useMemo(
    () =>
      allowedTabs.map((tab) => ({
        tab,
        label: getTabLabel(tab, role),
      })),
    [allowedTabs, role],
  )

  useEffect(() => {
    if (allowedTabs.includes(activeTab)) {
      return
    }

    setActiveTab(allowedTabs[0])
    setDashboardError('Нет доступа')
  }, [activeTab, allowedTabs])

  useEffect(() => {
    if (!token) {
      return
    }

    const selectedAppointment = role === 'doctor' ? selectedDoctorAppointment : selectedClientAppointment

    if (!selectedAppointment || doctorNotes[selectedAppointment.id] !== undefined) {
      return
    }

    const loadSelectedAppointmentNote = async () => {
      setNoteLoadingId(selectedAppointment.id)

      try {
        const response =
          role === 'doctor'
            ? await medBookApi.getDoctorAppointmentNote(token, selectedAppointment.id)
            : await medBookApi.getAppointmentNote(token, selectedAppointment.id)
        const noteText = extractNoteText(response)

        setDoctorNotes((prev) => ({
          ...prev,
          [selectedAppointment.id]: noteText,
        }))
        setAppointmentNoteExists((prev) => ({
          ...prev,
          [selectedAppointment.id]: noteText.trim().length > 0,
        }))
      } catch (error: unknown) {
        if (isApiHttpError(error, 404)) {
          setDoctorNotes((prev) => ({
            ...prev,
            [selectedAppointment.id]: '',
          }))
          setAppointmentNoteExists((prev) => ({
            ...prev,
            [selectedAppointment.id]: false,
          }))
          return
        }

        if (isApiHttpError(error, 403)) {
          if (role === 'doctor') {
            setDoctorNotes((prev) => ({
              ...prev,
              [selectedAppointment.id]: '',
            }))
            setAppointmentNoteExists((prev) => ({
              ...prev,
              [selectedAppointment.id]: false,
            }))
            return
          }

          setDashboardError('Нет доступа')
          return
        }

        setDashboardError(getErrorMessage(error, 'Failed to load note'))
      } finally {
        setNoteLoadingId('')
      }
    }

    void loadSelectedAppointmentNote()
  }, [token, role, selectedDoctorAppointment, selectedClientAppointment, doctorNotes])

  useEffect(() => {
    if (role !== 'client' || activeTab !== 'notes' || !token || clientAppointments.length === 0) {
      return
    }

    let cancelled = false

    const loadClientNotes = async () => {
      setIsLoadingClientNotes(true)

      const loadedNotes: Record<string, string> = {}
      const loadedExists: Record<string, boolean> = {}

      await Promise.all(
        clientAppointments.map(async (appointment) => {
          try {
            const response = await medBookApi.getAppointmentNote(token, appointment.id)
            const noteText = extractNoteText(response)

            loadedNotes[appointment.id] = noteText
            loadedExists[appointment.id] = noteText.trim().length > 0
          } catch (error: unknown) {
            if (isApiHttpError(error, 404)) {
              loadedNotes[appointment.id] = ''
              loadedExists[appointment.id] = false
              return
            }

            if (isApiHttpError(error, 403)) {
              if (!cancelled) {
                setDashboardError('Нет доступа')
              }
              return
            }

            if (!cancelled) {
              setDashboardError(getErrorMessage(error, 'Failed to load notes'))
            }
          }
        }),
      )

      if (cancelled) {
        return
      }

      setDoctorNotes((prev) => ({
        ...prev,
        ...loadedNotes,
      }))
      setAppointmentNoteExists((prev) => ({
        ...prev,
        ...loadedExists,
      }))

      const firstWithNote = clientAppointments.find((item) => loadedExists[item.id])

      if (firstWithNote) {
        setSelectedClientAppointmentId((prev) => {
          if (prev && loadedExists[prev]) {
            return prev
          }

          return firstWithNote.id
        })
      }

      setIsLoadingClientNotes(false)
    }

    void loadClientNotes()

    return () => {
      cancelled = true
    }
  }, [role, activeTab, token, clientAppointments])

  useEffect(() => {
    if (role !== 'doctor' || activeTab !== 'notes' || !token) {
      return
    }

    let cancelled = false

    const loadDoctorPersonalNote = async () => {
      setIsLoadingDoctorPersonalNote(true)

      try {
        const response = await medBookApi.getUserNotes(token)
        const noteText = extractUserNoteText(response)

        if (!cancelled) {
          setDoctorPersonalNote(noteText)
        }
      } catch (error: unknown) {
        if (isApiHttpError(error, 404)) {
          if (!cancelled) {
            setDoctorPersonalNote('')
          }
          return
        }

        if (!cancelled) {
          setDashboardError(getErrorMessage(error, 'Failed to load personal note'))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDoctorPersonalNote(false)
        }
      }
    }

    void loadDoctorPersonalNote()

    return () => {
      cancelled = true
    }
  }, [role, activeTab, token])

  const submitAuth = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setAuthError('')
    setAuthSuccess('')

    if (authMode === 'register') {
      const registerRequest =
        role === 'client'
          ? medBookApi.registerClient({
              email,
              password,
              first_name: firstName,
              last_name: lastName,
              phone,
              role: 'client',
            })
          : medBookApi.submitDoctorApplication({
              email,
              password,
              first_name: firstName,
              last_name: lastName,
              phone,
              address,
              specialization,
              clinic_name: clinicName,
              consultation_fee: Number.parseInt(consultationFee || '0', 10),
              experience_years: Number.parseInt(experienceYears || '0', 10),
              license_number: licenseNumber,
              documents_url: documentsUrl,
            })

      registerRequest
        .then(() => {
          if (role === 'doctor') {
            setAuthSuccess('Application submitted. Wait for admin approval, then sign in.')
          } else {
            setAuthSuccess('Registration successful. Now login with your account.')
          }
          setAuthMode('login')
        })
        .catch((error: unknown) => {
          setAuthError(getErrorMessage(error, 'Registration failed'))
        })
        .finally(() => {
          setIsSubmitting(false)
        })

      return
    }

    medBookApi
      .login({ email, password })
      .then((response) => {
        const nextRole = extractRole(response, role)
        const nextToken = extractToken(response)
        const nextName = extractDisplayName(response, nextRole === 'doctor' ? 'Dr. Sterling' : 'Client')

        if (!nextToken) {
          throw new Error('Token was not returned by API')
        }

        setDisplayName(nextName)
        completeLogin(nextToken, nextRole)
      })
      .catch((error: unknown) => {
        setAuthError(getErrorMessage(error, 'Login failed'))
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  const switchAuthMode = (mode: AuthMode) => {
    if (mode === 'register' && role === 'admin') {
      setRole('doctor')
    }

    setAuthMode(mode)
    setAuthError('')
    setAuthSuccess('')
  }

  const completeLogin = (nextToken: string, nextRole: Role) => {
    window.localStorage.setItem('medbook_token', nextToken)
    window.localStorage.setItem('medbook_role', nextRole)
    setToken(nextToken)
    setRole(nextRole)
    setActiveTab(roleTabs[nextRole][0])
    setScreen('dashboard')
    void loadDashboard(nextToken, nextRole)
  }

  const logout = () => {
    window.localStorage.removeItem('medbook_token')
    window.localStorage.removeItem('medbook_role')
    setToken('')
    setScreen('login')
    setRole('doctor')
    setActiveTab('appointments')
    setAuthMode('login')
    setDashboardError('')
    setDashboardSuccess('')
  }

  const loadDashboard = async (authToken: string, nextRole: Role) => {
    setIsLoadingDashboard(true)
    setDashboardError('')
    setDashboardSuccess('')

    try {
      if (nextRole === 'client') {
        const [doctorResponse, appointmentResponse] = await Promise.all([
          medBookApi.listDoctors(),
          medBookApi.listAppointments(authToken),
        ])

        const loadedDoctors = normalizeDoctors(doctorResponse)
        setDoctors(loadedDoctors)
        setBookingDoctorId((prev) => {
          if (prev && loadedDoctors.some((doctor) => doctor.id === prev)) {
            return prev
          }

          return loadedDoctors[0]?.id || ''
        })
        setClientAppointments(normalizeAppointments(appointmentResponse, 'client'))
      } else if (nextRole === 'doctor') {
        const [doctorResponse, appointmentResponse, patientsResponse] = await Promise.all([
          medBookApi.listDoctors(),
          medBookApi.listDoctorAppointments(authToken),
          medBookApi.listPatients(authToken),
        ])

        setDoctors(normalizeDoctors(doctorResponse))
        setDoctorAppointments(normalizeAppointments(appointmentResponse, 'doctor'))
        setDoctorPatients(normalizePatients(patientsResponse))
      } else {
        const response = await medBookApi.listAdminDoctorApplications(authToken)
        const applications = normalizeDoctorApplications(response)

        setDoctorApplications(applications)
        setSelectedApplicationId((prev) => {
          if (prev && applications.some((application) => application.id === prev)) {
            return prev
          }

          return applications[0]?.id || ''
        })
        setSelectedApplicationDetail(null)
      }
    } catch (error: unknown) {
      if (isApiHttpError(error, 403)) {
        setDashboardError('Нет доступа')
      } else {
        setDashboardError(getErrorMessage(error, 'Cannot load dashboard data'))
      }
    } finally {
      setIsLoadingDashboard(false)
    }
  }

  const refreshCurrentDashboard = () => {
    if (!token) {
      return
    }

    void loadDashboard(token, role)
  }

  const runServiceAction = async (loadingId: string, title: string, action: () => Promise<unknown>) => {
    if (!token) {
      setDashboardError('Login required')
      return
    }

    setServiceLoadingId(loadingId)
    setDashboardError('')
    setDashboardSuccess('')

    try {
      const payload = await action()
      setServiceResult({ title, payload: payload ?? { ok: true } })
      setDashboardSuccess(`${title} loaded`)
    } catch (error: unknown) {
      setDashboardError(getErrorMessage(error, `${title} failed`))
    } finally {
      setServiceLoadingId('')
    }
  }

  const getActiveAppointmentId = () => {
    if (role === 'doctor') {
      return selectedAppointmentId || doctorAppointments[0]?.id || ''
    }

    return selectedClientAppointmentId || clientAppointments[0]?.id || ''
  }

  const getActivePatientId = () => doctorPatients[0]?.id || ''

  const requireActiveAppointmentId = () => {
    const appointmentId = getActiveAppointmentId()

    if (!appointmentId) {
      setDashboardError('Select or create an appointment first')
      return ''
    }

    return appointmentId
  }

  const runAppointmentAction = (loadingId: string, title: string, action: (appointmentId: string) => Promise<unknown>) => {
    const appointmentId = requireActiveAppointmentId()

    if (!appointmentId) {
      return
    }

    void runServiceAction(loadingId, title, () => action(appointmentId))
  }

  const submitComplaintFromWorkspace = () => {
    void runServiceAction('submit-complaint', 'Complaint submitted', () =>
      medBookApi.submitComplaint(token, {
        subject: complaintSubject,
        message: complaintMessage,
        description: complaintMessage,
        category: 'service',
        appointment_id: getActiveAppointmentId() || undefined,
      }),
    )
  }

  const showToast = (message: string, tone: ToastTone = 'success') => {
    setToast({ message, tone })
  }

  const openSettingsPanel = () => {
    setActiveOverlay('settings')
    setDashboardError('')
    setDashboardSuccess('')
    showToast('Открыты настройки', 'success')
  }

  const openNotificationsPanel = () => {
    setActiveOverlay('notifications')
    setDashboardError('')
    setDashboardSuccess('')
    showToast('Открыты уведомления', 'success')
  }

  const openProfileTab = () => {
    setActiveTab('profile')
    setActiveOverlay(null)
    setDashboardError('')
    setDashboardSuccess('')
    showToast('Открыт профиль', 'success')
  }

  const closeOverlay = () => {
    setActiveOverlay(null)
  }

  const renderDashboardOverlays = () => (
    <>
      {toast ? <div className={`toast toast-${toast.tone}`}>{toast.message}</div> : null}

      {activeOverlay ? (
        <div className="overlay-backdrop" role="presentation" onClick={closeOverlay}>
          <section
            className="overlay-panel glass-card"
            role="dialog"
            aria-modal="true"
            aria-label={activeOverlay === 'settings' ? 'Settings' : 'Notifications'}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="overlay-header">
              <div>
                <p className="section-label">{activeOverlay === 'settings' ? 'Account' : 'Updates'}</p>
                <h3>{activeOverlay === 'settings' ? 'Settings' : 'Notifications'}</h3>
              </div>
              <button type="button" className="icon-button overlay-close" onClick={closeOverlay} aria-label="Close">
                ×
              </button>
            </div>

            {activeOverlay === 'settings' ? (
              <div className="overlay-body">
                <p className="dashboard-note">Manage the current account and jump to the right screen.</p>
                <div className="settings-list">
                  <div>
                    <span className="section-label">User</span>
                    <strong>{displayName}</strong>
                  </div>
                  <div>
                    <span className="section-label">Role</span>
                    <strong>{roleLabels[role]}</strong>
                  </div>
                  <div>
                    <span className="section-label">Email</span>
                    <strong>{email}</strong>
                  </div>
                </div>

                <div className="overlay-actions">
                  <button type="button" className="primary-button compact" onClick={openProfileTab}>
                    Open Profile
                  </button>
                  <button type="button" className="outline-button" onClick={refreshCurrentDashboard}>
                    Refresh Data
                  </button>
                  <button type="button" className="text-action" onClick={closeOverlay}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="overlay-body">
                <p className="dashboard-note">Notifications are not connected to the backend yet, so this panel is a placeholder.</p>
                <div className="overlay-empty-state">
                  <strong>No notifications yet</strong>
                  <span>When the backend API is added, unread items will appear here.</span>
                </div>

                <div className="overlay-actions">
                  <button type="button" className="outline-button" onClick={refreshCurrentDashboard}>
                    Refresh Data
                  </button>
                  <button type="button" className="text-action" onClick={closeOverlay}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  )

  const onBookAppointment = (doctorId: string) => {
    if (!token) {
      setDashboardError('Login required')
      return
    }

    if (!doctorId) {
      setDashboardError('Doctor id is required for booking')
      return
    }

    setActionId(`book-${doctorId}`)
    setDashboardError('')
    setDashboardSuccess('')

    medBookApi
      .createAppointment(token, {
        doctor_id: doctorId,
        appointment_date: bookingDate,
        start_time: bookingTime,
        end_time: addMinutes(bookingTime, 30),
        notes: bookingNotes,
      })
      .then(() => {
        setDashboardSuccess('Appointment created successfully')
        return medBookApi.listAppointments(token)
      })
      .then((response) => {
        setClientAppointments(normalizeAppointments(response, 'client'))
      })
      .catch((error: unknown) => {
        if (isApiHttpError(error, 403)) {
          setDashboardError('Нет доступа')
        } else {
          setDashboardError(getErrorMessage(error, 'Failed to create appointment'))
        }
      })
      .finally(() => {
        setActionId('')
      })
  }

  const onCancelAppointment = (appointmentId: string) => {
    if (!token) {
      return
    }

    setActionId(`cancel-${appointmentId}`)
    setDashboardError('')

    medBookApi
      .cancelAppointment(token, appointmentId)
      .then(() => {
        setDashboardSuccess('Appointment canceled')
        return medBookApi.listAppointments(token)
      })
      .then((response) => {
        setClientAppointments(normalizeAppointments(response, 'client'))
      })
      .catch((error: unknown) => {
        if (isApiHttpError(error, 403)) {
          setDashboardError('Нет доступа')
        } else {
          setDashboardError(getErrorMessage(error, 'Cancel failed'))
        }
      })
      .finally(() => {
        setActionId('')
      })
  }

  const onReloadClientNote = () => {
    if (!selectedClientAppointmentId) {
      return
    }

    setDoctorNotes((prev) => {
      const next = { ...prev }
      delete next[selectedClientAppointmentId]
      return next
    })
    setAppointmentNoteExists((prev) => {
      const next = { ...prev }
      delete next[selectedClientAppointmentId]
      return next
    })
    setDashboardError('')
    setDashboardSuccess('')
  }

  const onSaveDoctorAppointmentNote = async (appointmentId: string) => {
    if (!token) {
      return
    }

    const noteText = (doctorNotes[appointmentId] || '').trim()

    if (!noteText) {
      setDashboardError('Note text is required')
      return
    }

    setActionId(`note-${appointmentId}`)
    setDashboardError('')
    setDashboardSuccess('')

    try {
      const payload = { note_text: noteText }
      const response = appointmentNoteExists[appointmentId]
        ? await medBookApi.updateDoctorAppointmentNote(token, appointmentId, payload)
        : await medBookApi.createDoctorAppointmentNote(token, appointmentId, payload)
      const savedNote = extractNoteText(response) || noteText

      setDoctorNotes((prev) => ({
        ...prev,
        [appointmentId]: savedNote,
      }))
      setAppointmentNoteExists((prev) => ({
        ...prev,
        [appointmentId]: true,
      }))
      setDashboardSuccess('Note saved')
    } catch (error: unknown) {
      if (isApiHttpError(error, 403)) {
        setDashboardError('Нет доступа')
      } else {
        setDashboardError(getErrorMessage(error, 'Failed to save note'))
      }
    } finally {
      setActionId('')
    }
  }

  const onSaveDoctorPersonalNote = async () => {
    if (!token) {
      return
    }

    setDashboardError('')
    setDashboardSuccess('')
    setIsSavingDoctorPersonalNote(true)

    try {
      const response = await medBookApi.updateUserNotes(token, { content: doctorPersonalNote })
      setDoctorPersonalNote(extractUserNoteText(response) || doctorPersonalNote)
      setDashboardSuccess('Personal note saved')
    } catch (error: unknown) {
      if (isApiHttpError(error, 403)) {
        setDashboardError('Нет доступа')
      } else {
        setDashboardError(getErrorMessage(error, 'Failed to save personal note'))
      }
    } finally {
      setIsSavingDoctorPersonalNote(false)
    }
  }

  const onConfirmDoctorAppointment = (appointmentId: string) => {
    if (!token) {
      return
    }

    setActionId(`confirm-${appointmentId}`)
    setDashboardError('')

    medBookApi
      .confirmAppointment(token, appointmentId)
      .then(() => {
        setDashboardSuccess('Appointment confirmed')
        return medBookApi.listDoctorAppointments(token)
      })
      .then((response) => {
        setDoctorAppointments(normalizeAppointments(response, 'doctor'))
      })
      .catch((error: unknown) => {
        if (isApiHttpError(error, 403)) {
          setDashboardError('Нет доступа')
        } else {
          setDashboardError(getErrorMessage(error, 'Confirm failed'))
        }
      })
      .finally(() => {
        setActionId('')
      })
  }

  const onCompleteDoctorAppointment = (appointmentId: string) => {
    if (!token) {
      return
    }

    setActionId(`complete-${appointmentId}`)
    setDashboardError('')

    medBookApi
      .completeAppointment(token, appointmentId)
      .then(() => {
        setDashboardSuccess('Appointment completed')
        return medBookApi.listDoctorAppointments(token)
      })
      .then((response) => {
        setDoctorAppointments(normalizeAppointments(response, 'doctor'))
      })
      .catch((error: unknown) => {
        if (isApiHttpError(error, 403)) {
          setDashboardError('Нет доступа')
        } else {
          setDashboardError(getErrorMessage(error, 'Complete failed'))
        }
      })
      .finally(() => {
        setActionId('')
      })
  }

  const onApproveDoctorApplication = async (applicationId: string) => {
    if (!token) {
      return
    }

    setActionId(`approve-${applicationId}`)
    setDashboardError('')
    setDashboardSuccess('')

    try {
      await medBookApi.approveAdminDoctorApplication(token, applicationId)
      setDashboardSuccess('Application approved. Doctor account is now active.')
      await loadDashboard(token, 'admin')
    } catch (error: unknown) {
      if (isApiHttpError(error, 403)) {
        setDashboardError('Нет доступа')
      } else {
        setDashboardError(getErrorMessage(error, 'Failed to approve application'))
      }
    } finally {
      setActionId('')
    }
  }

  const onRejectDoctorApplication = async (applicationId: string) => {
    if (!token) {
      return
    }

    setActionId(`reject-${applicationId}`)
    setDashboardError('')
    setDashboardSuccess('')

    try {
      await medBookApi.rejectAdminDoctorApplication(token, applicationId)
      setDashboardSuccess('Application rejected.')
      await loadDashboard(token, 'admin')
    } catch (error: unknown) {
      if (isApiHttpError(error, 403)) {
        setDashboardError('Нет доступа')
      } else {
        setDashboardError(getErrorMessage(error, 'Failed to reject application'))
      }
    } finally {
      setActionId('')
    }
  }

  const moveCalendarMonth = (delta: number) => {
    setCalendarCursor((prev) => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() + delta)
      return next
    })
  }

  const renderServiceResult = () =>
    serviceResult ? (
      <article className="api-result glass-card">
        <div className="section-title-row">
          <h3>{serviceResult.title}</h3>
          <button type="button" className="text-action" onClick={() => setServiceResult(null)}>
            Очистить
          </button>
        </div>
        {renderReadableData(serviceResult.payload)}
      </article>
    ) : (
      <article className="api-result glass-card">
        <h3>Backend response</h3>
        <p className="dashboard-note">Run any action to see backend data as readable cards and lists.</p>
      </article>
    )

  const renderServiceButton = (id: string, label: string, onClick: () => void) => (
    <button type="button" className="outline-button" onClick={onClick} disabled={serviceLoadingId !== ''}>
      {serviceLoadingId === id ? 'Loading...' : label}
    </button>
  )

  const renderVisitWorkspace = () => (
    <section className="service-grid">
      <article className="tab-panel glass-card">
        <p className="section-label">Selected appointment</p>
        <h3>{getActiveAppointmentId() || 'No appointment selected'}</h3>
        <p>Use the appointment cards first, then open visit card, pre-visit, transparency, follow-up, feedback, and chat endpoints.</p>

        <div className="service-actions">
          {renderServiceButton('visit-card', 'Visit card', () =>
            runAppointmentAction('visit-card', 'Visit card', (appointmentId) => medBookApi.getVisitCard(token, appointmentId)),
          )}
          {renderServiceButton('transparency', 'Transparency', () =>
            runAppointmentAction('transparency', 'Appointment transparency', (appointmentId) =>
              medBookApi.getAppointmentTransparency(token, appointmentId),
            ),
          )}
          {renderServiceButton('previsit', 'Pre-visit form', () =>
            runAppointmentAction('previsit', 'Pre-visit form', (appointmentId) => medBookApi.getPreVisitForm(token, appointmentId)),
          )}
          {renderServiceButton('checklist', 'Preparation checklist', () =>
            runAppointmentAction('checklist', 'Preparation checklist', (appointmentId) =>
              medBookApi.getPreparationChecklist(token, appointmentId),
            ),
          )}
          {renderServiceButton('follow-up', 'Follow-up', () =>
            runAppointmentAction('follow-up', 'Follow-up', (appointmentId) => medBookApi.getFollowUp(token, appointmentId)),
          )}
          {renderServiceButton('patient-confirm', 'Confirm appointment', () =>
            runAppointmentAction('patient-confirm', 'Appointment confirmed', (appointmentId) =>
              medBookApi.confirmAppointmentByPatient(token, appointmentId),
            ),
          )}
        </div>

        <div className="service-form">
          <label className="field">
            <span>Symptoms</span>
            <input value={preVisitSymptoms} onChange={(event) => setPreVisitSymptoms(event.target.value)} />
          </label>
          <label className="field">
            <span>Medications</span>
            <input value={preVisitMedications} onChange={(event) => setPreVisitMedications(event.target.value)} />
          </label>
          {renderServiceButton('save-previsit', 'Save pre-visit', () =>
            runAppointmentAction('save-previsit', 'Pre-visit saved', (appointmentId) =>
              medBookApi.upsertPreVisitForm(token, appointmentId, {
                symptoms: preVisitSymptoms,
                medications: preVisitMedications,
                allergies: '',
                notes: bookingNotes,
              }),
            ),
          )}
          {renderServiceButton('feedback', 'Submit feedback', () =>
            runAppointmentAction('feedback', 'Feedback submitted', (appointmentId) =>
              medBookApi.submitAppointmentFeedback(token, appointmentId, {
                rating: 5,
                comment: 'Everything was clear and professional.',
              }),
            ),
          )}
        </div>
      </article>

      {renderServiceResult()}
    </section>
  )

  const renderDoctorWorkspace = () => (
    <section className="service-grid">
      <article className="tab-panel glass-card">
        <p className="section-label">Doctor workspace</p>
        <h3>{getActiveAppointmentId() || 'No appointment selected'}</h3>
        <p>Clinical card, follow-up, post-visit chat, patient summaries, and schedule endpoints from your backend.</p>

        <div className="service-actions">
          {renderServiceButton('doctor-card', 'Appointment card', () =>
            runAppointmentAction('doctor-card', 'Doctor appointment card', (appointmentId) =>
              medBookApi.getDoctorAppointmentCard(token, appointmentId),
            ),
          )}
          {renderServiceButton('save-doctor-card', 'Save card', () =>
            runAppointmentAction('save-doctor-card', 'Doctor appointment card saved', (appointmentId) =>
              medBookApi.upsertDoctorAppointmentCard(token, appointmentId, {
                diagnosis: 'Initial consultation',
                treatment_plan: 'Follow the recommended plan',
                doctor_notes: doctorNotes[appointmentId] || '',
              }),
            ),
          )}
          {renderServiceButton('doctor-follow-up', 'Follow-up', () =>
            runAppointmentAction('doctor-follow-up', 'Doctor follow-up', (appointmentId) =>
              medBookApi.getDoctorFollowUp(token, appointmentId),
            ),
          )}
          {renderServiceButton('save-follow-up', 'Save follow-up', () =>
            runAppointmentAction('save-follow-up', 'Doctor follow-up saved', (appointmentId) =>
              medBookApi.upsertDoctorFollowUp(token, appointmentId, {
                recommendations: doctorNotes[appointmentId] || 'Continue monitoring symptoms.',
                next_visit_date: bookingDate,
                status: 'active',
              }),
            ),
          )}
          {renderServiceButton('doctor-chat', 'Open chat', () =>
            runAppointmentAction('doctor-chat', 'Doctor appointment chat', (appointmentId) =>
              medBookApi.getDoctorAppointmentChat(token, appointmentId),
            ),
          )}
          {renderServiceButton('send-doctor-chat', 'Send chat message', () =>
            runAppointmentAction('send-doctor-chat', 'Doctor chat message sent', (appointmentId) =>
              medBookApi.sendDoctorAppointmentChatMessage(token, appointmentId, { message: chatMessage }),
            ),
          )}
        </div>

        <div className="service-form">
          <label className="field">
            <span>Chat message</span>
            <input value={chatMessage} onChange={(event) => setChatMessage(event.target.value)} />
          </label>
          {renderServiceButton('profile', 'My profile', () =>
            void runServiceAction('profile', 'Profile', () => medBookApi.getProfile(token)),
          )}
          {renderServiceButton('patient-summary', 'First patient summary', () => {
            const patientId = getActivePatientId()
            if (!patientId) {
              setDashboardError('No patient loaded yet')
              return
            }
            void runServiceAction('patient-summary', 'Patient clinical summary', () =>
              medBookApi.getPatientClinicalSummary(token, patientId),
            )
          })}
        </div>
      </article>

      {renderServiceResult()}
    </section>
  )

  const renderScheduleWorkspace = () => (
    <section className="service-grid">
      <article className="tab-panel glass-card">
        <p className="section-label">Schedule API</p>
        <h3>Doctor schedule</h3>
        <p>Manage schedule, working hours, breaks, week slots, vacations, and date exceptions.</p>
        <div className="service-actions">
          {renderServiceButton('schedule', 'Load schedule', () =>
            void runServiceAction('schedule', 'Doctor schedule', () => medBookApi.getDoctorSchedule(token)),
          )}
          {renderServiceButton('week-slots', 'Week slots', () =>
            void runServiceAction('week-slots', 'Week slots', () => medBookApi.getWeekSlots(token, bookingDate)),
          )}
          {renderServiceButton('working-hours', 'Save working hours', () =>
            void runServiceAction('working-hours', 'Working hours saved', () =>
              medBookApi.replaceWorkingHours(token, {
                monday: { start: '09:00', end: '17:00' },
                tuesday: { start: '09:00', end: '17:00' },
                wednesday: { start: '09:00', end: '17:00' },
                thursday: { start: '09:00', end: '17:00' },
                friday: { start: '09:00', end: '15:00' },
              }),
            ),
          )}
          {renderServiceButton('breaks', 'Save breaks', () =>
            void runServiceAction('breaks', 'Breaks saved', () =>
              medBookApi.replaceBreaks(token, [{ day: 'monday', start: '12:30', end: '13:00' }]),
            ),
          )}
          {renderServiceButton('exception', 'Save date exception', () =>
            void runServiceAction('exception', 'Date exception saved', () =>
              medBookApi.upsertScheduleException(token, bookingDate, {
                is_available: false,
                reason: 'Conference day',
              }),
            ),
          )}
        </div>
      </article>

      {renderServiceResult()}
    </section>
  )

  const renderSupportWorkspace = () => (
    <section className="service-grid">
      <article className="tab-panel glass-card">
        <p className="section-label">Communication</p>
        <h3>Notifications and complaints</h3>
        <p>These actions use notification and complaint endpoints from your Postman collection.</p>
        <div className="service-actions">
          {renderServiceButton('notifications', 'Notifications', () =>
            void runServiceAction('notifications', 'Notifications', () => medBookApi.listNotifications(token)),
          )}
          {renderServiceButton('unread-count', 'Unread count', () =>
            void runServiceAction('unread-count', 'Unread notifications', () => medBookApi.getUnreadNotificationsCount(token)),
          )}
          {renderServiceButton('read-all', 'Mark all read', () =>
            void runServiceAction('read-all', 'Notifications marked as read', () => medBookApi.markAllNotificationsAsRead(token)),
          )}
          {renderServiceButton('complaints', role === 'admin' ? 'All complaints' : 'My complaints', () =>
            void runServiceAction('complaints', 'Complaints', () =>
              role === 'admin' ? medBookApi.listAdminComplaints(token) : medBookApi.listMyComplaints(token),
            ),
          )}
          {renderServiceButton('auto-replies', 'Auto replies', () =>
            void runServiceAction('auto-replies', 'Communication auto replies', () => medBookApi.listCommunicationAutoReplies(token)),
          )}
        </div>

        {role !== 'admin' ? (
          <div className="service-form">
            <label className="field">
              <span>Subject</span>
              <input value={complaintSubject} onChange={(event) => setComplaintSubject(event.target.value)} />
            </label>
            <label className="field">
              <span>Message</span>
              <input value={complaintMessage} onChange={(event) => setComplaintMessage(event.target.value)} />
            </label>
            {renderServiceButton('submit-complaint', 'Submit complaint', submitComplaintFromWorkspace)}
          </div>
        ) : null}
      </article>

      {renderServiceResult()}
    </section>
  )

  const renderAdminOperations = () => (
    <section className="service-grid">
      <article className="tab-panel glass-card">
        <p className="section-label">Admin operations</p>
        <h3>Statistics and audit</h3>
        <p>Live dashboard statistics, recent snapshots, audit logs, and application decision history.</p>
        <div className="service-actions">
          {renderServiceButton('admin-stats', 'Dashboard statistics', () =>
            void runServiceAction('admin-stats', 'Dashboard statistics', () => medBookApi.getAdminStatistics(token)),
          )}
          {renderServiceButton('recent-stats', 'Recent snapshots', () =>
            void runServiceAction('recent-stats', 'Recent dashboard snapshots', () => medBookApi.getRecentAdminStatistics(token)),
          )}
          {renderServiceButton('activity-logs', 'Activity logs', () =>
            void runServiceAction('activity-logs', 'Admin activity logs', () => medBookApi.getAdminActivityLogs(token)),
          )}
          {selectedApplicationId
            ? renderServiceButton('application-decisions', 'Application decisions', () =>
                void runServiceAction('application-decisions', 'Application decisions', () =>
                  medBookApi.listAdminDoctorApplicationDecisions(token, selectedApplicationId),
                ),
              )
            : null}
        </div>
      </article>

      {renderServiceResult()}
    </section>
  )

  const renderDirectoryWorkspace = () => (
    <section className="service-grid">
      <article className="tab-panel glass-card">
        <p className="section-label">Directory</p>
        <h3>Clinics and specializations</h3>
        <p>Public directory plus admin create/list endpoints.</p>
        <div className="service-actions">
          {renderServiceButton('public-clinics', 'Public clinics', () =>
            void runServiceAction('public-clinics', 'Public clinics', () => medBookApi.listClinics()),
          )}
          {renderServiceButton('admin-clinics', 'Admin clinics', () =>
            void runServiceAction('admin-clinics', 'Admin clinics', () => medBookApi.listAdminClinics(token)),
          )}
          {renderServiceButton('public-specializations', 'Public specializations', () =>
            void runServiceAction('public-specializations', 'Public specializations', () => medBookApi.listSpecializations()),
          )}
          {renderServiceButton('admin-specializations', 'Admin specializations', () =>
            void runServiceAction('admin-specializations', 'Admin specializations', () => medBookApi.listAdminSpecializations(token)),
          )}
        </div>

        <div className="service-form">
          <label className="field">
            <span>Clinic name</span>
            <input value={clinicDraftName} onChange={(event) => setClinicDraftName(event.target.value)} />
          </label>
          <label className="field">
            <span>City</span>
            <input value={clinicDraftCity} onChange={(event) => setClinicDraftCity(event.target.value)} />
          </label>
          {renderServiceButton('create-clinic', 'Create clinic', () =>
            void runServiceAction('create-clinic', 'Clinic created', () =>
              medBookApi.createAdminClinic(token, {
                name: clinicDraftName,
                address: '123 Main St',
                city: clinicDraftCity,
                phone: '+77010000000',
                website: 'https://medbook.example.com',
              }),
            ),
          )}
          <label className="field">
            <span>Specialization</span>
            <input value={specializationDraftName} onChange={(event) => setSpecializationDraftName(event.target.value)} />
          </label>
          {renderServiceButton('create-specialization', 'Create specialization', () =>
            void runServiceAction('create-specialization', 'Specialization created', () =>
              medBookApi.createAdminSpecialization(token, {
                name: specializationDraftName,
                description: `${specializationDraftName} diagnostics and treatment`,
              }),
            ),
          )}
        </div>
      </article>

      {renderServiceResult()}
    </section>
  )

  return screen === 'login' ? (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="brand-lockup">
          <span className="brand-mark">MedBook</span>
        </div>

        <div className="auth-copy">
          <p className="eyebrow">Clinical platform</p>
          <h1>
            The Clinical <span>Sanctuary</span>
          </h1>
          <p className="lede">
            Redefining medical management with editorial precision and restorative aesthetics.
            Your professional mastery deserves a premium environment.
          </p>
        </div>

        <div className="auth-footer">
          <span className="trust-badge">
            <span className="trust-icon" aria-hidden="true">
              <LockIcon />
            </span>
            Trusted by 5,000+ specialists
          </span>
        </div>
      </section>

      <section className="auth-panel">
        <form className="login-card" onSubmit={submitAuth}>
          <header className="login-header">
            <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p>
              {authMode === 'login'
                ? 'Select your professional role to begin.'
                : role === 'doctor'
                  ? 'Submit doctor application for admin approval.'
                  : 'Register as client, then sign in.'}
            </p>
            <p className="connection-state">{connectionMessage}</p>
          </header>

          <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={authMode === 'login' ? 'role-pill active' : 'role-pill'}
              onClick={() => switchAuthMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'role-pill active' : 'role-pill'}
              onClick={() => switchAuthMode('register')}
            >
              Register
            </button>
          </div>

          <div className="role-switch" role="tablist" aria-label="Select role">
            <button
              type="button"
              className={role === 'client' ? 'role-pill active' : 'role-pill'}
              onClick={() => setRole('client')}
            >
              <UsersIcon />
              Client
            </button>
            <button
              type="button"
              className={role === 'doctor' ? 'role-pill active' : 'role-pill'}
              onClick={() => setRole('doctor')}
            >
              <BriefcaseIcon />
              Doctor
            </button>
          </div>

          {authMode === 'register' ? (
            <>
              <div className="name-row">
                <label className="field">
                  <span>First name</span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="John"
                    required
                  />
                </label>

                <label className="field">
                  <span>Last name</span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Doe"
                    required
                  />
                </label>
              </div>

              <label className="field">
                <span>Phone</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+1234567890"
                  required
                />
              </label>

              {role === 'doctor' ? (
                <>
                  <label className="field">
                    <span>Address</span>
                    <input
                      type="text"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="Almaty"
                      required
                    />
                  </label>

                  <div className="name-row">
                    <label className="field">
                      <span>Specialization</span>
                      <input
                        type="text"
                        value={specialization}
                        onChange={(event) => setSpecialization(event.target.value)}
                        placeholder="Cardiologist"
                        required
                      />
                    </label>

                    <label className="field">
                      <span>Clinic name</span>
                      <input
                        type="text"
                        value={clinicName}
                        onChange={(event) => setClinicName(event.target.value)}
                        placeholder="Heart Clinic"
                        required
                      />
                    </label>
                  </div>

                  <div className="name-row">
                    <label className="field">
                      <span>Consultation fee</span>
                      <input
                        type="number"
                        min="0"
                        value={consultationFee}
                        onChange={(event) => setConsultationFee(event.target.value)}
                        required
                      />
                    </label>

                    <label className="field">
                      <span>Experience years</span>
                      <input
                        type="number"
                        min="0"
                        value={experienceYears}
                        onChange={(event) => setExperienceYears(event.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span>License number</span>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(event) => setLicenseNumber(event.target.value)}
                      placeholder="LIC-12345"
                      required
                    />
                  </label>

                  <label className="field">
                    <span>Documents URL</span>
                    <input
                      type="url"
                      value={documentsUrl}
                      onChange={(event) => setDocumentsUrl(event.target.value)}
                      placeholder="https://example.com/doc.pdf"
                      required
                    />
                  </label>
                </>
              ) : null}
            </>
          ) : null}

          <label className="field">
            <span>Work email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@clinic.com"
              required
            />
          </label>

          <div className="password-row">
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          {authMode === 'login' ? (
            <button type="button" className="ghost-link">
              Forgot security code?
            </button>
          ) : null}
          </div>

          {authMode === 'login' ? (
            <label className="remember-row">
              <input type="checkbox" defaultChecked />
              <span>Stay authenticated for 30 days</span>
            </label>
          ) : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? authMode === 'login'
                ? 'Signing in...'
                : role === 'doctor'
                  ? 'Submitting application...'
                  : 'Creating account...'
              : authMode === 'login'
                ? 'Access Dashboard'
                : role === 'doctor'
                  ? 'Submit Application'
                  : 'Create Account'}
            <ArrowIcon />
          </button>

          {authError ? <p className="form-error">{authError}</p> : null}
          {authSuccess ? <p className="form-success">{authSuccess}</p> : null}

          <div className="secondary-panel">
            <p>
              {authMode === 'login'
                ? 'New to MedBook Clinical Suites?'
                : 'Already have an account?'}
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => switchAuthMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? 'Create Account' : 'Back to Login'}
            </button>
          </div>

          <footer className="login-footer">
            <button type="button" className="footer-link">
              Security standards
            </button>
            <button type="button" className="footer-link">
              Privacy policy
            </button>
          </footer>
        </form>
      </section>
    </main>
  ) : role === 'client' ? (
    <main className="dashboard-shell client-dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">MedBook</div>

        <div className="profile-card compact">
          <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" alt="Profile" />
          <div>
            <strong>{displayName}</strong>
            <span>{roleLabels[role]}</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Primary">
          {navItems.map((item) => renderNavButton(item.tab, activeTab, setActiveTab, item.label, iconForTab(item.tab)))}
        </nav>

        <button className="sidebar-action" type="button" onClick={logout}>
          Logout
        </button>
      </aside>

      <section className="dashboard-main">
        <header className="topbar">
          <div className="search-box">
            <SearchIcon />
            <span>Search medical records...</span>
          </div>
          <div className="topbar-icons">
            <button type="button" className="icon-button" onClick={openNotificationsPanel}>
              <BellIcon />
            </button>
            <button type="button" className="icon-button" onClick={openSettingsPanel}>
              <GearIcon />
            </button>
            <button type="button" className="avatar-button" onClick={openSettingsPanel}>
              <img src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=120&q=80" alt="User avatar" />
            </button>
          </div>
        </header>

        <section className="page-head">
          <div>
            <p className="eyebrow">Daily overview</p>
            <h2>Welcome Back, Clinician.</h2>
            <p className="page-subtitle">Here is your medical overview for today.</p>
            {isLoadingDashboard ? <p className="dashboard-note">Loading data...</p> : null}
            {dashboardError ? <p className="form-error">{dashboardError}</p> : null}
            {dashboardSuccess ? <p className="form-success">{dashboardSuccess}</p> : null}
          </div>
          <div className="shift-card">
            <div className="shift-icon">
              <StopwatchIcon />
            </div>
            <div>
              <span>Next shift</span>
              <strong>09:00 AM</strong>
            </div>
          </div>
        </section>

        {activeTab === 'appointments' ? (
        <div className="client-grid">
          <section className="stack-left">
            <article className="calendar-card glass-card">
              <div className="card-header">
                <h3>{calendarTitle}</h3>
                <div className="card-arrows">
                  <button type="button" onClick={() => moveCalendarMonth(-1)} aria-label="Previous month">
                    ‹
                  </button>
                  <button type="button" onClick={() => moveCalendarMonth(1)} aria-label="Next month">
                    ›
                  </button>
                </div>
              </div>
              <div className="calendar-grid">
                <div className="calendar-row weekday-row">
                  {weekDays.map((day) => (
                    <span key={day} className="calendar-cell weekday">
                      {day}
                    </span>
                  ))}
                </div>
                {calendarRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="calendar-row">
                    {row.map((cell) => {
                      const isActive = cell.iso === bookingDate
                      const className = `calendar-cell${isActive ? ' active' : ''}${cell.inCurrentMonth ? '' : ' muted'}`

                      return (
                        <button
                          type="button"
                          key={cell.iso}
                          className={className}
                          onClick={() => setBookingDate(cell.iso)}
                        >
                          {cell.day}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </article>

            <article className="next-appointments glass-card">
              <p className="section-label">My appointments</p>
              <div className="appointment-list compact-list">
                {clientAppointments.length === 0 ? (
                  <p className="dashboard-note">No appointments yet</p>
                ) : (
                    clientAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className={selectedClientAppointmentId === appointment.id ? 'appointment-chip active-chip' : 'appointment-chip'}
                        onClick={() => setSelectedClientAppointmentId(appointment.id)}
                      >
                      <div className="mini-avatar success">✓</div>
                      <div>
                        <strong>{appointment.title}</strong>
                        <span>{appointment.time} · {appointment.detail}</span>
                      </div>
                      <div className="chip-actions">
                        <span className={appointment.rawStatus === 'confirmed' ? 'status-badge success' : 'status-badge pending'}>
                          {appointment.status}
                        </span>
                        {canCancelAppointment(appointment.rawStatus) ? (
                          <button
                            type="button"
                            className="tiny-action"
                              onClick={(event) => {
                                event.stopPropagation()
                                onCancelAppointment(appointment.id)
                              }}
                            disabled={actionId !== ''}
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selectedClientAppointment ? (
                <article className="patient-note-card glass-card active-note">
                  <label className="notes-field">
                    <span>Doctor note for {selectedClientAppointment.title}</span>
                    {noteLoadingId === selectedClientAppointment.id ? (
                      <textarea readOnly value="Loading note..." />
                    ) : (
                      <textarea
                        readOnly
                        value={doctorNotes[selectedClientAppointment.id] || ''}
                        placeholder="The doctor has not added a note yet."
                      />
                    )}
                  </label>
                </article>
              ) : null}
            </article>
          </section>

          <section className="specialists-card">
            <div className="section-title-row">
              <h3>Available Specialists</h3>
              <button type="button" className="text-action" onClick={refreshCurrentDashboard}>
                Refresh
              </button>
            </div>

            <article className="quick-book glass-card">
              <p className="section-label">Quick booking</p>
              <div className="quick-book-grid">
                <input type="date" value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} />
                <input type="time" value={bookingTime} onChange={(event) => setBookingTime(event.target.value)} />
              </div>
              <input
                className="quick-book-notes"
                type="text"
                value={bookingNotes}
                onChange={(event) => setBookingNotes(event.target.value)}
                placeholder="Consultation note"
              />
            </article>

            <div className="specialist-grid">
              {doctors.length === 0 ? (
                <article className="specialist-card glass-card">
                  <p className="dashboard-note">No doctors returned from backend yet</p>
                </article>
              ) : doctors.map((doctor) => (
                <article key={doctor.id} className="specialist-card glass-card">
                  <div className="specialist-head">
                    <img
                      src={
                        doctor.name.includes('Sarah')
                          ? 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=120&q=80'
                          : doctor.name.includes('Julian')
                            ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80'
                            : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80'
                      }
                      alt={doctor.name}
                    />
                    <div>
                      <h4>{doctor.name}</h4>
                      <p>{doctor.title}</p>
                      <span className="rating">{doctor.clinicName}</span>
                      <span className="rating">★ {doctor.rating} <em>({doctor.reviews})</em></span>
                    </div>
                  </div>

                  <div className="tag-row">
                    {doctor.tags.map((tag) => (
                      <span key={tag} className="tag-pill">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => {
                      onBookAppointment(doctor.id)
                    }}
                    disabled={actionId === `book-${doctor.id}` || (bookingDoctorId === doctor.id && actionId !== '')}
                  >
                    {actionId === `book-${doctor.id}` ? 'Booking...' : 'Book Now'}
                  </button>

                  <div className="doctor-meta-row">
                    <span>Fee: {doctor.consultationFee}</span>
                    <span>Experience: {doctor.experienceYears}</span>
                    <span className={doctor.availableToday ? 'status-badge success' : 'status-badge pending'}>
                      {doctor.availableToday ? 'Available today' : 'Not available today'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
        ) : activeTab === 'notes' ? (
          <section className="tab-panel glass-card">
            <h3>My Notes</h3>
            {isLoadingClientNotes ? (
              <p className="dashboard-note">Loading doctor recommendations...</p>
            ) : clientAppointments.length === 0 ? (
              <p className="dashboard-note">No appointments available yet.</p>
            ) : clientAppointmentsWithNotes.length === 0 ? (
              <p className="dashboard-note">No recommendations from your doctor yet.</p>
            ) : (
              <>
                <div className="appointment-list compact-list">
                  {clientAppointmentsWithNotes.map((appointment) => (
                    <div
                      key={appointment.id}
                      className={selectedClientAppointmentId === appointment.id ? 'appointment-chip active-chip' : 'appointment-chip'}
                      onClick={() => setSelectedClientAppointmentId(appointment.id)}
                    >
                      <div className="mini-avatar success">✓</div>
                      <div>
                        <strong>{appointment.title}</strong>
                        <span>{appointment.time} · {appointment.status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedClientNoteAppointment ? (
                  <article className="patient-note-card glass-card active-note">
                    <label className="notes-field">
                      <span>Doctor note for {selectedClientNoteAppointment.title}</span>
                      {noteLoadingId === selectedClientNoteAppointment.id ? (
                        <textarea readOnly value="Loading note..." />
                      ) : (
                        <textarea
                          readOnly
                          value={doctorNotes[selectedClientNoteAppointment.id] || ''}
                          placeholder="The doctor has not added a note yet."
                        />
                      )}
                    </label>

                    <div className="note-actions">
                      <button type="button" className="text-action" onClick={onReloadClientNote}>
                        Reload note
                      </button>
                    </div>
                  </article>
                ) : null}
              </>
            )}
          </section>
        ) : activeTab === 'insights' ? (
          renderVisitWorkspace()
        ) : activeTab === 'support' ? (
          renderSupportWorkspace()
        ) : activeTab === 'doctors' ? (
          <section className="tab-panel glass-card">
            <h3>Doctors</h3>
            <p>Loaded from API: {doctors.length} doctors.</p>
            <div className="specialist-grid">
              {doctors.length === 0 ? (
                <article className="specialist-card glass-card">
                  <p className="dashboard-note">No doctors returned from backend yet. Check the API response format.</p>
                </article>
              ) : (
                doctors.map((doctor) => (
                  <article key={doctor.id} className="specialist-card glass-card">
                    <div className="specialist-head">
                      <img
                        src={
                          doctor.name.includes('Sarah')
                            ? 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=120&q=80'
                            : doctor.name.includes('Julian')
                              ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80'
                              : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80'
                        }
                        alt={doctor.name}
                      />
                      <div>
                        <h4>{doctor.name}</h4>
                        <p>{doctor.title}</p>
                        <span className="rating">{doctor.clinicName}</span>
                        <span className="rating">★ {doctor.rating} <em>({doctor.reviews})</em></span>
                      </div>
                    </div>

                    <div className="tag-row">
                      {doctor.tags.map((tag) => (
                        <span key={tag} className="tag-pill">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => onBookAppointment(doctor.id)}
                      disabled={actionId === `book-${doctor.id}`}
                    >
                      {actionId === `book-${doctor.id}` ? 'Booking...' : 'Book Now'}
                    </button>

                    <div className="doctor-meta-row">
                      <span>Fee: {doctor.consultationFee}</span>
                      <span>Experience: {doctor.experienceYears}</span>
                      <span className={doctor.availableToday ? 'status-badge success' : 'status-badge pending'}>
                        {doctor.availableToday ? 'Available today' : 'Not available today'}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
            <button type="button" className="outline-button" onClick={refreshCurrentDashboard}>
              Refresh Data
            </button>
          </section>
        ) : (
          <section className="tab-panel glass-card">
            <h3>{activeTabLabel}</h3>
            <p>
              {activeTab === 'profile'
                ? `Current user: ${displayName} (${roleLabels[role]}).`
                : `Section ${activeTabLabel} is interactive and ready for backend fields.`}
            </p>
            <button type="button" className="outline-button" onClick={refreshCurrentDashboard}>
              Refresh Data
            </button>
          </section>
        )}

        <button className="floating-action" type="button" onClick={refreshCurrentDashboard}>
          + New Consultation
        </button>

        {renderDashboardOverlays()}
      </section>
    </main>
  ) : role === 'doctor' ? (
    <main className="dashboard-shell doctor-dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">MedBook</div>

        <div className="profile-card compact">
          <img src="https://images.unsplash.com/photo-1511174511562-5f7f18b874f8?auto=format&fit=crop&w=120&q=80" alt="Profile" />
          <div>
            <strong>{displayName}</strong>
            <span>{roleLabels[role]}</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Primary">
          {navItems.map((item) => renderNavButton(item.tab, activeTab, setActiveTab, item.label, iconForTab(item.tab)))}
        </nav>

        <button className="sidebar-action" type="button" onClick={logout}>
          Logout
        </button>
      </aside>

      <section className="dashboard-main doctor-main">
        <header className="topbar">
          <div className="search-box wide">
            <SearchIcon />
            <span>Search patients or records...</span>
          </div>
          <div className="topbar-icons">
            <button type="button" className="icon-button" onClick={openNotificationsPanel}>
              <BellIcon />
            </button>
            <button type="button" className="icon-button" onClick={openSettingsPanel}>
              <GearIcon />
            </button>
            <button type="button" className="avatar-button" onClick={openSettingsPanel}>
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80" alt="User avatar" />
            </button>
          </div>
        </header>

        <section className="page-head doctor-head">
          <div>
            <p className="eyebrow">Daily overview</p>
            <h2>Today&apos;s Appointments</h2>
            <p className="page-subtitle">Good morning, {displayName}. Manage all consultations from here.</p>
            {isLoadingDashboard ? <p className="dashboard-note">Loading data...</p> : null}
            {dashboardError ? <p className="form-error">{dashboardError}</p> : null}
            {dashboardSuccess ? <p className="form-success">{dashboardSuccess}</p> : null}
          </div>
          <div className="shift-card doctor-shift">
            <div className="shift-icon">
              <StopwatchIcon />
            </div>
            <div>
              <span>Next shift</span>
              <strong>09:00 AM</strong>
            </div>
          </div>
        </section>

        {activeTab === 'appointments' ? (
        <div className="doctor-grid">
          <section className="appointments-column">
            {doctorAppointments.length === 0 ? (
              <article className="appointment-card glass-card">
                <p className="dashboard-note">No appointments available</p>
              </article>
            ) : (
              doctorAppointments.map((appointment) => {
                const isSelected = appointment.id === selectedAppointmentId

                return (
                  <article
                    key={appointment.id}
                    className={isSelected ? 'patient-note-card glass-card active-note' : 'appointment-card glass-card'}
                    onClick={() => setSelectedAppointmentId(appointment.id)}
                  >
                    <div className="appointment-meta">
                      <div className="appointment-person">
                        <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" alt={appointment.title} />
                        <div>
                          <h3>{appointment.title}</h3>
                          <p>{appointment.detail}</p>
                        </div>
                      </div>
                      <div className={appointment.rawStatus === 'in_progress' ? 'status-pill live' : 'time-pill'}>
                        {appointment.time}
                      </div>
                    </div>

                    <div className="dual-actions">
                      {canConfirmAppointment(appointment.rawStatus) ? (
                        <button
                          type="button"
                          className="soft-button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onConfirmDoctorAppointment(appointment.id)
                          }}
                          disabled={actionId !== ''}
                        >
                          {actionId === `confirm-${appointment.id}` ? 'Confirming...' : 'Confirm'}
                        </button>
                      ) : null}
                      {canCompleteAppointment(appointment.rawStatus) ? (
                        <button
                          type="button"
                          className="primary-button compact"
                          onClick={(event) => {
                            event.stopPropagation()
                            onCompleteDoctorAppointment(appointment.id)
                          }}
                          disabled={actionId !== ''}
                        >
                          {actionId === `complete-${appointment.id}` ? 'Saving...' : 'Complete'}
                        </button>
                      ) : null}
                    </div>
                  </article>
                )
              })
            )}

            {selectedDoctorAppointment ? (
              <article className="patient-note-card glass-card active-note">
                <label className="notes-field">
                  <span>Clinical notes</span>
                  <textarea
                    placeholder="Start typing clinical observations..."
                    value={doctorNotes[selectedDoctorAppointment.id] || ''}
                    onChange={(event) =>
                      setDoctorNotes((prev) => ({
                        ...prev,
                        [selectedDoctorAppointment.id]: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="note-actions">
                  <button type="button" className="text-action" onClick={() => setDoctorNotes((prev) => ({ ...prev, [selectedDoctorAppointment.id]: '' }))}>
                    Discard
                  </button>
                  <button
                    type="button"
                    className="soft-button"
                    onClick={() => onSaveDoctorAppointmentNote(selectedDoctorAppointment.id)}
                    disabled={actionId !== '' || !(doctorNotes[selectedDoctorAppointment.id] || '').trim()}
                  >
                    {actionId === `note-${selectedDoctorAppointment.id}` ? 'Saving...' : 'Save note'}
                  </button>
                  {canCompleteAppointment(selectedDoctorAppointment.rawStatus) ? (
                    <button
                      type="button"
                      className="save-button"
                      onClick={() => onCompleteDoctorAppointment(selectedDoctorAppointment.id)}
                      disabled={actionId !== ''}
                    >
                      Complete
                    </button>
                  ) : null}
                </div>
              </article>
            ) : null}
          </section>

          <aside className="doctor-sidebar">
            <article className="stats-card glass-card">
              <p className="section-label">Patient stats</p>
              <div className="stat-row">
                <span className="stat-label">Completed</span>
                <strong>{doctorAppointments.filter((item) => item.rawStatus === 'completed').length} / {doctorAppointments.length}</strong>
              </div>
              <div className="stat-row">
                <span className="stat-label">Remaining</span>
                <strong>{doctorAppointments.filter((item) => item.rawStatus !== 'completed').length}</strong>
              </div>
            </article>

            <article className="oncall-card">
              <p className="section-label light">On call duty</p>
              <h3>Tomorrow</h3>
              <p>Staff Hospital South Wing · 07:00 - 15:00</p>
              <button type="button" className="oncall-button" onClick={refreshCurrentDashboard}>View Full Schedule</button>
            </article>

            <article className="history-card glass-card">
              <p className="section-label">Patient history</p>
              <div className="history-item">
                <img src="https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=120&q=80" alt="Last patient" />
                <div>
                  <strong>{selectedDoctorAppointment?.title || 'No patient selected'}</strong>
                  <span>Updated now</span>
                </div>
                <span className="history-arrow">›</span>
              </div>
            </article>
          </aside>
        </div>
        ) : activeTab === 'schedule' ? (
          renderScheduleWorkspace()
        ) : activeTab === 'insights' ? (
          renderDoctorWorkspace()
        ) : activeTab === 'support' ? (
          renderSupportWorkspace()
        ) : activeTab === 'doctors' ? (
          <section className="tab-panel glass-card">
            <h3>Doctors</h3>
            <p>Loaded from API: {doctors.length} doctors.</p>
            <div className="specialist-grid">
              {doctors.length === 0 ? (
                <article className="specialist-card glass-card">
                  <p className="dashboard-note">No doctors returned from backend yet. Check the API response format.</p>
                </article>
              ) : (
                doctors.map((doctor) => (
                  <article key={doctor.id} className="specialist-card glass-card">
                    <div className="specialist-head">
                      <img
                        src={
                          doctor.name.includes('Sarah')
                            ? 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=120&q=80'
                            : doctor.name.includes('Julian')
                              ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80'
                              : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80'
                        }
                        alt={doctor.name}
                      />
                      <div>
                        <h4>{doctor.name}</h4>
                        <p>{doctor.title}</p>
                        <span className="rating">{doctor.clinicName}</span>
                        <span className="rating">★ {doctor.rating} <em>({doctor.reviews})</em></span>
                      </div>
                    </div>

                    <div className="tag-row">
                      {doctor.tags.map((tag) => (
                        <span key={tag} className="tag-pill">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="doctor-meta-row">
                      <span>Fee: {doctor.consultationFee}</span>
                      <span>Experience: {doctor.experienceYears}</span>
                      <span className={doctor.availableToday ? 'status-badge success' : 'status-badge pending'}>
                        {doctor.availableToday ? 'Available today' : 'Not available today'}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
            <button type="button" className="outline-button" onClick={refreshCurrentDashboard}>
              Refresh Data
            </button>
          </section>
        ) : activeTab === 'patients' ? (
          <section className="tab-panel glass-card">
            <h3>Patients</h3>
            <p>Loaded from API: {doctorPatients.length} patients.</p>
            <div className="appointment-list compact-list">
              {doctorPatients.length === 0 ? (
                <p className="dashboard-note">No patients returned from backend yet.</p>
              ) : (
                doctorPatients.map((patient) => (
                  <article key={patient.id} className="appointment-chip">
                    <div className="mini-avatar">•</div>
                    <div>
                      <strong>{patient.name}</strong>
                      <span>{patient.subtitle}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
            <button type="button" className="outline-button" onClick={refreshCurrentDashboard}>
              Refresh Data
            </button>
          </section>
        ) : activeTab === 'notes' ? (
          <section className="tab-panel glass-card">
            <h3>My Notes</h3>
            <p>Personal doctor note from /api/v1/notes.</p>
            <article className="patient-note-card glass-card active-note">
              <label className="notes-field">
                <span>Personal sticky note</span>
                {isLoadingDoctorPersonalNote ? (
                  <textarea readOnly value="Loading note..." />
                ) : (
                  <textarea
                    value={doctorPersonalNote}
                    onChange={(event) => setDoctorPersonalNote(event.target.value)}
                    placeholder="Write your personal memo for this shift..."
                  />
                )}
              </label>

              <div className="note-actions">
                <button
                  type="button"
                  className="text-action"
                  onClick={() => setDoctorPersonalNote('')}
                  disabled={isSavingDoctorPersonalNote || isLoadingDoctorPersonalNote}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="soft-button"
                  onClick={onSaveDoctorPersonalNote}
                  disabled={isSavingDoctorPersonalNote || isLoadingDoctorPersonalNote}
                >
                  {isSavingDoctorPersonalNote ? 'Saving...' : 'Save note'}
                </button>
              </div>
            </article>
          </section>
        ) : (
          <section className="tab-panel glass-card">
            <h3>{activeTabLabel}</h3>
            <p>
              {activeTab === 'profile'
                  ? `Current user: ${displayName} (${roleLabels[role]}).`
                  : `Section ${activeTabLabel} is ready for your backend fields.`}
            </p>
            <button type="button" className="outline-button" onClick={refreshCurrentDashboard}>
              Refresh Data
            </button>
          </section>
        )}

        <button className="floating-action" type="button" onClick={refreshCurrentDashboard}>
          + Refresh Consultations
        </button>

        {renderDashboardOverlays()}
      </section>
    </main>
  ) : (
    <main className="dashboard-shell doctor-dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">MedBook</div>

        <div className="profile-card compact">
          <img src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=120&q=80" alt="Profile" />
          <div>
            <strong>{displayName}</strong>
            <span>{roleLabels[role]}</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Primary">
          {navItems.map((item) => renderNavButton(item.tab, activeTab, setActiveTab, item.label, iconForTab(item.tab)))}
        </nav>

        <button className="sidebar-action" type="button" onClick={logout}>
          Logout
        </button>
      </aside>

      <section className="dashboard-main doctor-main">
        <header className="topbar">
          <div className="search-box wide">
            <SearchIcon />
            <span>Review doctor applications...</span>
          </div>
          <div className="topbar-icons">
            <button type="button" className="icon-button" onClick={openNotificationsPanel}>
              <BellIcon />
            </button>
            <button type="button" className="icon-button" onClick={openSettingsPanel}>
              <GearIcon />
            </button>
            <button type="button" className="avatar-button" onClick={openSettingsPanel}>
              <img src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=120&q=80" alt="User avatar" />
            </button>
          </div>
        </header>

        <section className="page-head doctor-head">
          <div>
            <p className="eyebrow">Moderation panel</p>
            <h2>Doctor Applications</h2>
            <p className="page-subtitle">Inspect and verify doctor-submitted application data.</p>
            {isLoadingDashboard ? <p className="dashboard-note">Loading data...</p> : null}
            {dashboardError ? <p className="form-error">{dashboardError}</p> : null}
            {dashboardSuccess ? <p className="form-success">{dashboardSuccess}</p> : null}
          </div>
          <div className="shift-card doctor-shift">
            <div className="shift-icon">
              <StopwatchIcon />
            </div>
            <div>
              <span>Total applications</span>
              <strong>{doctorApplications.length}</strong>
            </div>
          </div>
        </section>

        {activeTab === 'applications' ? (
          <section className="tab-panel glass-card">
            {doctorApplications.length === 0 ? (
              <p className="dashboard-note">No doctor applications found.</p>
            ) : (
              <div className="admin-review-grid">
                <div className="admin-list">
                  {doctorApplications.map((application) => (
                    <button
                      key={application.id}
                      type="button"
                      className={selectedApplicationId === application.id ? 'appointment-chip active-chip admin-application-chip' : 'appointment-chip admin-application-chip'}
                      onClick={() => setSelectedApplicationId(application.id)}
                    >
                      <div className="mini-avatar">{application.fullName[0] || '?'}</div>
                      <div>
                        <strong>{application.fullName}</strong>
                        <span>{application.specialization} · {application.clinicName}</span>
                      </div>
                      <span className={application.rawStatus === 'approved' ? 'status-badge success' : 'status-badge pending'}>
                        {application.status}
                      </span>
                    </button>
                  ))}
                </div>

                <article className="patient-note-card glass-card active-note">
                  {isLoadingApplicationDetail ? (
                    <p className="dashboard-note">Loading application details...</p>
                  ) : selectedApplicationDetail ? (
                    <>
                      <h3>{selectedApplicationDetail.fullName}</h3>
                      <div className="admin-detail-grid">
                        <div>
                          <span className="section-label">Work email</span>
                          <p>{selectedApplicationDetail.email}</p>
                        </div>
                        <div>
                          <span className="section-label">Phone</span>
                          <p>{selectedApplicationDetail.phone}</p>
                        </div>
                        <div>
                          <span className="section-label">Address</span>
                          <p>{selectedApplicationDetail.address}</p>
                        </div>
                        <div>
                          <span className="section-label">Specialization</span>
                          <p>{selectedApplicationDetail.specialization}</p>
                        </div>
                        <div>
                          <span className="section-label">Clinic</span>
                          <p>{selectedApplicationDetail.clinicName}</p>
                        </div>
                        <div>
                          <span className="section-label">Consultation fee</span>
                          <p>{selectedApplicationDetail.consultationFee}</p>
                        </div>
                        <div>
                          <span className="section-label">Experience years</span>
                          <p>{selectedApplicationDetail.experienceYears}</p>
                        </div>
                        <div>
                          <span className="section-label">License number</span>
                          <p>{selectedApplicationDetail.licenseNumber}</p>
                        </div>
                        <div>
                          <span className="section-label">Documents URL</span>
                          <p>
                            {selectedApplicationDetail.documentsUrl ? (
                              <a href={selectedApplicationDetail.documentsUrl} target="_blank" rel="noreferrer">
                                Open document
                              </a>
                            ) : (
                              'Not provided'
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="section-label">Created at</span>
                          <p>{selectedApplicationDetail.createdAt}</p>
                        </div>
                      </div>

                      <div className="note-actions">
                        <button
                          type="button"
                          className="soft-button"
                          onClick={() => onApproveDoctorApplication(selectedApplicationDetail.id)}
                          disabled={actionId !== '' || selectedApplicationDetail.rawStatus === 'approved'}
                        >
                          {actionId === `approve-${selectedApplicationDetail.id}` ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="outline-button"
                          onClick={() => onRejectDoctorApplication(selectedApplicationDetail.id)}
                          disabled={actionId !== '' || selectedApplicationDetail.rawStatus === 'rejected'}
                        >
                          {actionId === `reject-${selectedApplicationDetail.id}` ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="dashboard-note">Select an application to inspect details.</p>
                  )}
                </article>
              </div>
            )}
          </section>
        ) : activeTab === 'insights' ? (
          renderAdminOperations()
        ) : activeTab === 'directory' ? (
          renderDirectoryWorkspace()
        ) : activeTab === 'support' ? (
          renderSupportWorkspace()
        ) : (
          <section className="tab-panel glass-card">
            <h3>{activeTabLabel}</h3>
            <p>
              {activeTab === 'profile'
                ? `Current user: ${displayName} (${roleLabels[role]}).`
                : `Section ${activeTabLabel} is ready for your backend fields.`}
            </p>
            <button type="button" className="outline-button" onClick={refreshCurrentDashboard}>
              Refresh Data
            </button>
          </section>
        )}

        <button className="floating-action" type="button" onClick={refreshCurrentDashboard}>
          + Refresh Applications
        </button>

        {renderDashboardOverlays()}
      </section>
    </main>
  )
}

function renderNavButton(
  tab: NavTab,
  activeTab: NavTab,
  setActiveTab: (tab: NavTab) => void,
  label: string,
  icon: ReactNode,
) {
  return (
    <button className={activeTab === tab ? 'nav-item active' : 'nav-item'} type="button" onClick={() => setActiveTab(tab)}>
      {icon}
      {label}
    </button>
  )
}

function getTabLabel(tab: NavTab, role: Role) {
  if (tab === 'appointments') {
    return role === 'doctor' ? 'Doctor Appointments' : 'Appointments'
  }

  if (tab === 'doctors') {
    return 'Doctors'
  }

  if (tab === 'schedule') {
    return 'Schedule'
  }

  if (tab === 'patients') {
    return 'Patients'
  }

  if (tab === 'notes') {
    return 'Notes'
  }

  if (tab === 'applications') {
    return 'Applications'
  }

  if (tab === 'insights') {
    return role === 'admin' ? 'Operations' : 'Workspace'
  }

  if (tab === 'support') {
    return 'Support'
  }

  if (tab === 'directory') {
    return 'Directory'
  }

  return 'Profile'
}

function iconForTab(tab: NavTab) {
  if (tab === 'doctors') {
    return <StethoscopeIcon />
  }

  if (tab === 'appointments') {
    return <CalendarIcon />
  }

  if (tab === 'schedule') {
    return <CalendarGridIcon />
  }

  if (tab === 'patients') {
    return <PatientsIcon />
  }

  if (tab === 'notes') {
    return <NotesIcon />
  }

  if (tab === 'applications') {
    return <ShieldIcon />
  }

  if (tab === 'insights') {
    return <BriefcaseIcon />
  }

  if (tab === 'support') {
    return <BellIcon />
  }

  if (tab === 'directory') {
    return <StethoscopeIcon />
  }

  return <ProfileIcon />
}

function canConfirmAppointment(status: string) {
  return status === 'pending'
}

function canCompleteAppointment(status: string) {
  return status === 'confirmed'
}

function canCancelAppointment(status: string) {
  return status === 'pending' || status === 'confirmed'
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  return value as Record<string, unknown>
}

function collectArray(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input
  }

  const data = asRecord(input)

  if (!data) {
    return []
  }

  const candidates = [
    data.data,
    data.items,
    data.results,
    data.applications,
    data.doctor_applications,
    data.appointments,
    data.doctors,
    asRecord(data.data)?.items,
    asRecord(data.data)?.applications,
    asRecord(data.data)?.doctor_applications,
    asRecord(data.data)?.appointments,
    asRecord(data.data)?.doctors,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  return []
}

function normalizeDoctors(response: unknown): DoctorCard[] {
  const list = collectArray(response)

  if (list.length === 0) {
    return []
  }

  return list
    .map((entry) => {
      const data = asRecord(entry)
      const user = asRecord(data?.user)

      if (!data) {
        return undefined
      }

      const firstName = stringValue(data.first_name) || stringValue(user?.first_name)
      const lastName = stringValue(data.last_name) || stringValue(user?.last_name)
      const fullName =
        stringValue(data.full_name) ||
        stringValue(data.name) ||
        [firstName, lastName].filter(Boolean).join(' ') ||
        stringValue(user?.email)
      const specialty = stringValue(data.specialization) || stringValue(data.specialty) || stringValue(data.title) || 'Specialist'
      const id = stringValue(data.id)

      if (!id) {
        return undefined
      }

      const consultationFee = stringValue(data.consultation_fee)
      const experienceYears = stringValue(data.experience_years)
      const availableToday = Boolean(data.available_today)

      return {
        id,
        name: fullName || id,
        title: specialty,
        clinicName: stringValue(data.clinic_name) || 'Clinic',
        consultationFee: consultationFee ? `${consultationFee}` : '—',
        experienceYears: experienceYears ? `${experienceYears} yrs` : '—',
        availableToday,
        rating: stringValue(data.rating) || '4.8',
        reviews: `${stringValue(data.reviews) || '0'} Reviews`,
        tags: [specialty.split(' ')[0] || 'Care', availableToday ? 'Available Today' : 'By Appointment'],
      }
    })
    .filter((item): item is DoctorCard => Boolean(item))
}

function normalizeAppointments(response: unknown, role: Role): AppointmentItem[] {
  const list = collectArray(response)

  return list
    .map((entry) => {
      const data = asRecord(entry)
      const doctor = asRecord(data?.doctor)
      const client = asRecord(data?.client)

      if (!data) {
        return undefined
      }

      const id = stringValue(data.id)

      if (!id) {
        return undefined
      }

      const startTime = formatApiTime(stringValue(data.start_time) || '09:00')
      const appointmentDate = stringValue(data.appointment_date)
      const patient = `${stringValue(client?.first_name) || stringValue(data.first_name)} ${stringValue(client?.last_name) || stringValue(data.last_name)}`.trim()
      const doctorName =
        `${stringValue(doctor?.first_name)} ${stringValue(doctor?.last_name)}`.trim() ||
        stringValue(data.doctor_name)
      const titleFromRole = role === 'doctor'
        ? stringValue(data.client_name) || stringValue(data.patient_name) || patient
        : doctorName || stringValue(data.provider_name)

      const fallbackTitle = role === 'doctor' ? 'Unknown patient' : 'Unknown doctor'

      return {
        id,
        title: titleFromRole || fallbackTitle,
        detail:
          stringValue(data.notes) ||
          stringValue(data.reason) ||
          (appointmentDate ? `Scheduled ${appointmentDate}` : 'Consultation'),
        status: prettifyStatus(stringValue(data.status) || 'pending'),
        rawStatus: stringValue(data.status) || 'pending',
        time: startTime,
      }
    })
    .filter((item): item is AppointmentItem => Boolean(item))
}

function normalizePatients(response: unknown): PatientItem[] {
  const list = collectArray(response)

  return list
    .map((entry) => {
      const data = asRecord(entry)
      const user = asRecord(data?.user)

      if (!data) {
        return undefined
      }

      const id = stringValue(data.id) || stringValue(user?.id)

      if (!id) {
        return undefined
      }

      const firstName = stringValue(data.first_name) || stringValue(user?.first_name)
      const lastName = stringValue(data.last_name) || stringValue(user?.last_name)
      const name =
        stringValue(data.full_name) ||
        stringValue(data.name) ||
        [firstName, lastName].filter(Boolean).join(' ') ||
        stringValue(user?.email) ||
        `Patient ${id.slice(0, 6)}`

      const subtitle =
        stringValue(data.phone) ||
        stringValue(user?.phone) ||
        stringValue(data.email) ||
        stringValue(user?.email) ||
        'No contact details'

      return {
        id,
        name,
        subtitle,
      }
    })
    .filter((item): item is PatientItem => Boolean(item))
}

function normalizeDoctorApplications(response: unknown): DoctorApplicationItem[] {
  const list = collectArray(response)

  return list
    .map((entry) => normalizeDoctorApplication(entry))
    .filter((item): item is DoctorApplicationItem => Boolean(item))
}

function normalizeDoctorApplication(input: unknown): DoctorApplicationItem | undefined {
  const data = asRecord(input)
  const nestedData = asRecord(data?.data)
  const source = nestedData || data

  if (!source) {
    return undefined
  }

  const id = stringValue(source.id)

  if (!id) {
    return undefined
  }

  const firstName = stringValue(source.first_name)
  const lastName = stringValue(source.last_name)
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || stringValue(source.email) || `Application ${id.slice(0, 8)}`
  const createdAt = formatDateTime(stringValue(source.created_at))

  return {
    id,
    fullName,
    email: stringValue(source.email) || 'Not provided',
    phone: stringValue(source.phone) || 'Not provided',
    specialization: stringValue(source.specialization) || 'Not provided',
    clinicName: stringValue(source.clinic_name) || 'Not provided',
    status: prettifyStatus(stringValue(source.status) || 'pending'),
    rawStatus: stringValue(source.status) || 'pending',
    address: stringValue(source.address) || 'Not provided',
    consultationFee: displayValue(source.consultation_fee) || 'Not provided',
    experienceYears: displayValue(source.experience_years) || 'Not provided',
    licenseNumber: stringValue(source.license_number) || 'Not provided',
    documentsUrl: stringValue(source.documents_url),
    createdAt,
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function displayValue(value: unknown) {
  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'string') {
    return value
  }

  return ''
}

function renderReadableData(value: unknown): ReactNode {
  const normalized = unwrapApiPayload(value)

  if (Array.isArray(normalized)) {
    if (normalized.length === 0) {
      return <p className="dashboard-note">No records returned.</p>
    }

    return (
      <div className="readable-list">
        {normalized.map((item, index) => (
          <article key={getReadableItemKey(item, index)} className="readable-card">
            {renderReadableObject(item, index)}
          </article>
        ))}
      </div>
    )
  }

  if (normalized && typeof normalized === 'object') {
    return <div className="readable-card readable-card-single">{renderReadableObject(normalized, 0)}</div>
  }

  return <p className="dashboard-note">{formatReadableValue(normalized)}</p>
}

function renderReadableObject(value: unknown, index: number): ReactNode {
  const data = asRecord(value)

  if (!data) {
    return <p className="dashboard-note">{formatReadableValue(value)}</p>
  }

  if (isActivityLogRecord(data)) {
    return renderActivityLogCard(data, index)
  }

  if (isApplicationDecisionRecord(data)) {
    return renderApplicationDecisionCard(data, index)
  }

  const displayData = getReadableDisplayData(data)
  const title = getReadableTitle(displayData, index)
  const subtitle = getReadableSubtitle(displayData)
  const entries = Object.entries(displayData).filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== '')

  return (
    <>
      <div className="readable-card-head">
        <div>
          <strong>{title}</strong>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        {getReadableStatus(displayData) ? <span className="status-badge pending">{getReadableStatus(displayData)}</span> : null}
      </div>

      <dl className="readable-fields">
        {entries.map(([key, entryValue]) => (
          <div key={key}>
            <dt>{humanizeKey(key)}</dt>
            <dd>{renderReadableFieldValue(entryValue)}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

function renderActivityLogCard(data: Record<string, unknown>, index: number): ReactNode {
  const admin = preferredText(data.admin_name, data.admin_email, data.admin_user_id)
  const target = preferredText(data.target_name, data.target_email, data.target_id)
  const action = preferredText(data.action_label, data.action)
  const actionDisplay = getReadableOperationValue(action)
  const date = preferredText(data.created_at, data.updated_at)
  const title = buildActivityLogTitle(data, index)
  const fields = [
    ['Администратор', admin],
    ['Объект', target],
    ['Действие', actionDisplay],
    ['Дата', date],
  ].filter(([, fieldValue]) => fieldValue)

  return (
    <>
      <div className="readable-card-head operation-card-head">
        <div>
          <strong>{title}</strong>
          {date ? <span>{formatReadableValue(date)}</span> : null}
        </div>
        {action ? <span className="status-badge pending operation-badge">{getShortOperationBadge(action)}</span> : null}
      </div>

      <dl className="readable-fields operation-fields">
        {fields.map(([label, fieldValue]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{renderReadableFieldValue(fieldValue)}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

function renderApplicationDecisionCard(data: Record<string, unknown>, index: number): ReactNode {
  const admin = preferredText(data.admin_name, data.admin_email, data.admin_user_id)
  const application = preferredText(data.application_name, data.application_email, data.application_id)
  const decision = preferredText(data.decision_label, data.decision)
  const decisionDisplay = getReadableOperationValue(decision)
  const date = preferredText(data.created_at, data.updated_at)
  const title = application || preferredText(data.title) || `Заявка ${index + 1}`
  const description = buildDecisionDescription(data, admin, decisionDisplay)
  const fields = [
    ['Администратор', admin],
    ['Заявка', application],
    ['Решение', decisionDisplay],
    ['Дата', date],
  ].filter(([, fieldValue]) => fieldValue)

  return (
    <>
      <div className="readable-card-head operation-card-head">
        <div>
          <strong>{title}</strong>
          {description ? <span>{description}</span> : null}
        </div>
        {decision ? <span className="status-badge pending operation-badge">{getShortOperationBadge(decision)}</span> : null}
      </div>

      <dl className="readable-fields operation-fields">
        {fields.map(([label, fieldValue]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{renderReadableFieldValue(fieldValue)}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

function renderReadableFieldValue(value: unknown): ReactNode {
  const unwrapped = unwrapApiPayload(value)

  if (Array.isArray(unwrapped)) {
    if (unwrapped.length === 0) {
      return 'No items'
    }

    return (
      <div className="nested-list">
        {unwrapped.slice(0, 4).map((item, index) => (
          <span key={getReadableItemKey(item, index)}>{getCompactReadableValue(item)}</span>
        ))}
        {unwrapped.length > 4 ? <span>+{unwrapped.length - 4} more</span> : null}
      </div>
    )
  }

  if (unwrapped && typeof unwrapped === 'object') {
    const data = asRecord(unwrapped)
    const summary = data ? getReadableTitle(data, 0) : ''

    if (summary && summary !== 'Record 1') {
      return summary
    }

    return (
      <div className="nested-list">
        {Object.entries(data || {})
          .slice(0, 4)
          .map(([key, nestedValue]) => (
            <span key={key}>
              {humanizeKey(key)}: {formatReadableValue(nestedValue)}
            </span>
          ))}
      </div>
    )
  }

  return formatReadableValue(unwrapped)
}

function getCompactReadableValue(value: unknown) {
  const data = asRecord(value)

  if (!data) {
    return formatReadableValue(value)
  }

  return getReadableTitle(data, 0)
}

function unwrapApiPayload(value: unknown): unknown {
  const data = asRecord(value)

  if (!data) {
    return value
  }

  const nestedData = asRecord(data.data)
  const candidates = [
    data.data,
    data.items,
    data.results,
    data.records,
    data.logs,
    data.activity_logs,
    data.decisions,
    data.application_decisions,
    nestedData?.items,
    nestedData?.results,
    nestedData?.records,
    nestedData?.logs,
    nestedData?.activity_logs,
    nestedData?.decisions,
    nestedData?.application_decisions,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  if (data.data && typeof data.data === 'object' && Object.keys(data).length <= 2) {
    return data.data
  }

  return value
}

function getReadableItemKey(value: unknown, index: number) {
  const data = asRecord(value)
  return stringValue(data?.id) || stringValue(data?.uuid) || stringValue(data?.email) || String(index)
}

function getReadableDisplayData(data: Record<string, unknown>) {
  if (isActivityLogRecord(data)) {
    return {
      title: preferredText(data.title, data.summary),
      summary: stringValue(data.summary),
      admin: preferredText(data.admin_name, data.admin_email, data.admin_user_id),
      target: preferredText(data.target_name, data.target_email, data.target_id),
      action_label: preferredText(data.action_label, data.action),
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  }

  if (isApplicationDecisionRecord(data)) {
    return {
      title: preferredText(data.title, data.decision_label, data.decision),
      admin: preferredText(data.admin_name, data.admin_email, data.admin_user_id),
      application: preferredText(data.application_name, data.application_email, data.application_id),
      decision_label: preferredText(data.decision_label, data.decision),
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  }

  return data
}

function isActivityLogRecord(data: Record<string, unknown>) {
  return 'admin_user_id' in data && 'target_id' in data && 'action' in data
}

function isApplicationDecisionRecord(data: Record<string, unknown>) {
  return 'admin_user_id' in data && 'application_id' in data && 'decision' in data
}

function buildActivityLogTitle(data: Record<string, unknown>, index: number) {
  const admin = preferredText(data.admin_name, data.admin_email, data.admin_user_id)
  const target = preferredText(data.target_name, data.target_email, data.target_id)
  const action = preferredText(data.action_label, data.action)
  const phrase = getOperationPhrase(action)

  if (admin && target && phrase) {
    return `${admin}: ${phrase} ${target}`
  }

  if (admin && action) {
    return `${admin}: ${action}`
  }

  return preferredText(data.title, data.summary, data.created_at) || `Запись ${index + 1}`
}

function buildDecisionDescription(data: Record<string, unknown>, admin: string, decision: string) {
  const title = preferredText(data.title)

  if (decision && admin) {
    return `${decision} - ${admin}`
  }

  if (title) {
    return title
  }

  return admin || decision
}

function getOperationPhrase(value: string) {
  const normalized = normalizeOperationText(value)

  if (normalized.includes('re review') || normalized.includes('повторн')) {
    return 'запросил повторную проверку заявки'
  }

  if (normalized.includes('role') || normalized.includes('роль')) {
    return 'изменил роль пользователя'
  }

  if (normalized.includes('approve') || normalized.includes('одобр')) {
    return 'одобрил заявку'
  }

  if (normalized.includes('reject') || normalized.includes('отказ') || normalized.includes('отклон')) {
    return 'отклонил заявку'
  }

  if (normalized.includes('status') || normalized.includes('статус')) {
    return 'изменил статус'
  }

  if (value) {
    return getReadableOperationValue(value)
  }

  return ''
}

function getReadableOperationValue(value: string) {
  if (!value) {
    return ''
  }

  return prettifyStatus(value)
}

function getShortOperationBadge(value: string) {
  const normalized = normalizeOperationText(value)

  if (normalized.includes('re review') || normalized.includes('повторн')) {
    return 'Проверка'
  }

  if (normalized.includes('approve') || normalized.includes('одобр')) {
    return 'Одобрено'
  }

  if (normalized.includes('reject') || normalized.includes('отказ') || normalized.includes('отклон')) {
    return 'Отказ'
  }

  if (normalized.includes('role') || normalized.includes('роль')) {
    return 'Роль'
  }

  if (normalized.includes('status') || normalized.includes('статус')) {
    return 'Статус'
  }

  return value.length > 18 ? `${value.slice(0, 18).trim()}...` : value
}

function normalizeOperationText(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replaceAll('-', ' ')
}

function preferredText(...values: unknown[]) {
  for (const value of values) {
    const text = stringValue(value).trim()

    if (text) {
      return text
    }
  }

  return ''
}

function getReadableTitle(data: Record<string, unknown>, index: number) {
  const firstName = stringValue(data.first_name) || stringValue(data.firstName)
  const lastName = stringValue(data.last_name) || stringValue(data.lastName)
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  return (
    stringValue(data.full_name) ||
    stringValue(data.fullName) ||
    stringValue(data.name) ||
    fullName ||
    stringValue(data.title) ||
    stringValue(data.summary) ||
    stringValue(data.subject) ||
    stringValue(data.email) ||
    stringValue(data.clinic_name) ||
    stringValue(data.specialization) ||
    stringValue(data.status) ||
    `Record ${index + 1}`
  )
}

function getReadableSubtitle(data: Record<string, unknown>) {
  const parts = [
    stringValue(data.role),
    stringValue(data.specialization),
    stringValue(data.clinic_name) || stringValue(data.clinicName),
    stringValue(data.appointment_date),
    stringValue(data.date),
    stringValue(data.created_at),
  ].filter(Boolean)

  return parts.slice(0, 3).join(' - ')
}

function getReadableStatus(data: Record<string, unknown>) {
  return prettifyStatus(
    stringValue(data.action_label) ||
      stringValue(data.decision_label) ||
      stringValue(data.status) ||
      stringValue(data.state) ||
      stringValue(data.action) ||
      stringValue(data.decision),
  )
}

function humanizeKey(key: string) {
  const labels: Record<string, string> = {
    id: 'ID',
    uuid: 'ID',
    first_name: 'First name',
    last_name: 'Last name',
    full_name: 'Full name',
    clinic_name: 'Clinic',
    consultation_fee: 'Consultation fee',
    experience_years: 'Experience',
    license_number: 'License number',
    documents_url: 'Documents',
    created_at: 'Created',
    updated_at: 'Updated',
    appointment_date: 'Appointment date',
    start_time: 'Start time',
    end_time: 'End time',
    doctor_id: 'Doctor',
    client_id: 'Client',
    patient_id: 'Patient',
    total_users: 'Total users',
    active_doctors: 'Active doctors',
    active_clients: 'Active clients',
    total_appointments: 'Total appointments',
    completed_appointments: 'Completed appointments',
    cancelled_appointments: 'Cancelled appointments',
    pending_applications: 'Pending applications',
    total_complaints: 'Total complaints',
    open_complaints: 'Open complaints',
    resolved_complaints: 'Resolved complaints',
    admin: 'Admin',
    target: 'Doctor/application',
    application: 'Application',
    action_label: 'Action',
    decision_label: 'Decision',
    summary: 'Summary',
  }

  return (
    labels[key] ||
    key
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  )
}

function formatReadableValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value)
  }

  if (typeof value === 'string') {
    if (!value) {
      return 'Not provided'
    }

    if (looksLikeDate(value)) {
      return formatDateTime(value)
    }

    return value
  }

  if (value === null || value === undefined) {
    return 'Not provided'
  }

  return String(value)
}

function looksLikeDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(value)
}

function prettifyStatus(status: string) {
  if (!status) {
    return 'Pending'
  }

  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function nextDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

function addMinutes(time: string, minutes: number) {
  const [hourRaw, minuteRaw] = time.split(':')
  const hour = Number.parseInt(hourRaw || '0', 10)
  const minute = Number.parseInt(minuteRaw || '0', 10)
  const total = hour * 60 + minute + minutes
  const normalized = ((total % 1440) + 1440) % 1440
  const nextHour = Math.floor(normalized / 60)
  const nextMinute = normalized % 60

  return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`
}

function formatApiTime(time: string) {
  const parts = time.split(':')

  if (parts.length < 2) {
    return time
  }

  const hour = Number.parseInt(parts[0] || '0', 10)
  const minute = Number.parseInt(parts[1] || '0', 10)

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return time
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatDateTime(value: string) {
  if (!value) {
    return 'Not provided'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildCalendarRows(cursor: Date) {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)

  const startOffset = (start.getDay() + 6) % 7
  const totalCells = Math.ceil((startOffset + end.getDate()) / 7) * 7
  const rows: Array<Array<{ day: number; iso: string; inCurrentMonth: boolean }>> = []

  for (let index = 0; index < totalCells; index += 1) {
    const date = new Date(start)
    date.setDate(index - startOffset + 1)

    const rowIndex = Math.floor(index / 7)
    if (!rows[rowIndex]) {
      rows[rowIndex] = []
    }

    rows[rowIndex].push({
      day: date.getDate(),
      iso: date.toISOString().slice(0, 10),
      inCurrentMonth: date.getMonth() === cursor.getMonth(),
    })
  }

  return rows
}

function extractToken(response: unknown) {
  const data = asRecord(response)
  const nestedData = asRecord(data?.data)

  const candidate =
    data?.access_token ??
    data?.accessToken ??
    data?.token ??
    data?.jwt ??
    nestedData?.access_token ??
    nestedData?.accessToken ??
    nestedData?.token ??
    ''

  return typeof candidate === 'string' ? candidate : ''
}

function extractRole(response: unknown, fallbackRole: Role): Role {
  const data = asRecord(response)
  const nestedData = asRecord(data?.data)
  const user = asRecord(data?.user) || asRecord(nestedData?.user)
  const candidate = stringValue(data?.role) || stringValue(nestedData?.role) || stringValue(user?.role)

  if (candidate === 'client') {
    return 'client'
  }

  if (candidate === 'doctor') {
    return 'doctor'
  }

  if (candidate === 'admin') {
    return 'admin'
  }

  return fallbackRole
}

function extractDisplayName(response: unknown, fallbackName: string) {
  const data = asRecord(response)
  const nestedData = asRecord(data?.data)
  const user = asRecord(data?.user) || asRecord(nestedData?.user)

  const firstName =
    stringValue(data?.first_name) ||
    stringValue(nestedData?.first_name) ||
    stringValue(user?.first_name)
  const lastName =
    stringValue(data?.last_name) ||
    stringValue(nestedData?.last_name) ||
    stringValue(user?.last_name)

  const combined = [firstName, lastName].filter(Boolean).join(' ')
  return combined || fallbackName
}

function extractNoteText(response: unknown) {
  const data = asRecord(response)
  const nestedData = asRecord(data?.data)

  const candidateValues = [
    data?.note_text,
    data?.doctor_notes,
    data?.text,
    data?.note,
    nestedData?.note_text,
    nestedData?.doctor_notes,
    nestedData?.text,
    nestedData?.note,
  ]

  for (const candidate of candidateValues) {
    if (typeof candidate === 'string') {
      return candidate
    }
  }

  const items = collectArray(response)

  if (items.length > 0) {
    return extractNoteText(items[0])
  }

  return ''
}

function extractUserNoteText(response: unknown) {
  const data = asRecord(response)
  const nestedData = asRecord(data?.data)

  const candidateValues = [
    data?.content,
    data?.note_text,
    nestedData?.content,
    nestedData?.note_text,
  ]

  for (const candidate of candidateValues) {
    if (typeof candidate === 'string') {
      return candidate
    }
  }

  return ''
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export default App

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 4a6 6 0 104.47 10.03l4.75 4.74 1.41-1.41-4.74-4.75A6 6 0 0010 4zm0 2a4 4 0 110 8 4 4 0 010-8z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a5 5 0 00-5 5v2.6c0 .9-.34 1.76-.95 2.43L4.6 13.7A1.5 1.5 0 005.7 16.2h12.6a1.5 1.5 0 001.1-2.5l-1.45-1.67c-.61-.67-.95-1.53-.95-2.43V7a5 5 0 00-5-5zm0 20a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22z" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.14 12.94a7.95 7.95 0 000-1.88l2.03-1.58-1.9-3.29-2.39.96a7.58 7.58 0 00-1.63-.94l-.36-2.54H9.11l-.36 2.54c-.57.22-1.11.53-1.63.94l-2.39-.96-1.9 3.29 2.03 1.58a7.95 7.95 0 000 1.88L2.83 14.5l1.9 3.29 2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54h5.24l.36-2.54c.57-.22 1.11-.53 1.63-.94l2.39.96 1.9-3.29-2.03-1.56zM12 15.4A3.4 3.4 0 1112 8.6a3.4 3.4 0 010 6.8z" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 5l7 7-7 7-1.4-1.4 4.6-4.6H4v-2h12.2l-4.6-4.6L13 5z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 12a4 4 0 100-8 4 4 0 000 8zm6 1a3 3 0 100-6 3 3 0 000 6zM3 20v-1a6 6 0 0111.66-2.2A7.98 7.98 0 0119 20v1H3z" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 6V5a2 2 0 012-2h0a2 2 0 012 2v1h4a2 2 0 012 2v3H4V8a2 2 0 012-2h4zm-6 7h16v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5zm7 1h2v2h-2v-2z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z" />
    </svg>
  )
}

function StethoscopeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3v6a4 4 0 008 0V3h-2v6a2 2 0 11-4 0V3H6zm10 8a4 4 0 00-4 4v1.59a3 3 0 10-2 0V15a6 6 0 0112 0v1a4 4 0 01-4 4h-1v-2h1a2 2 0 002-2v-1a4 4 0 00-4-4z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2h2v2h6V2h2v2h3a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h3V2zm13 8H4v10h16V10z" />
    </svg>
  )
}

function CalendarGridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h16v16H4V4zm2 2v2h12V6H6zm0 4v8h4v-8H6zm6 0v3h6v-3h-6zm0 5v3h6v-3h-6z" />
    </svg>
  )
}

function PatientsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 11a4 4 0 110-8 4 4 0 010 8zm8-1a3 3 0 100-6 3 3 0 000 6zM2 20v-1a6 6 0 0110.5-4.03A6.5 6.5 0 0122 20v1H2z" />
    </svg>
  )
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm8 1.5V8h4.5L14 3.5zM7 11h10v2H7v-2zm0 4h10v2H7v-2z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l8 3v6c0 5.25-3.44 9.78-8 11-4.56-1.22-8-5.75-8-11V5l8-3zm0 2.13L6 6.36v4.64c0 4.21 2.64 7.9 6 9.04 3.36-1.14 6-4.83 6-9.04V6.36l-6-2.23zm-1 4.87h2v3h3v2h-3v3h-2v-3H8v-2h3V9z" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0H5z" />
    </svg>
  )
}

function StopwatchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 2h4v2h-4V2zm2 4a8 8 0 100 16 8 8 0 000-16zm1 2v4.17l3.3 1.97-1 1.66L11 13V8h2z" />
    </svg>
  )
}
