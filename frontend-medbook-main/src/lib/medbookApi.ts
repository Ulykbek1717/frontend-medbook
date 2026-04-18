export type MedBookRole = 'client' | 'doctor' | 'admin'

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  email: string
  password: string
  first_name: string
  last_name: string
  phone: string
  role: MedBookRole
}

export type CompleteAppointmentPayload = {
  doctor_notes: string
}

export type AppointmentNotePayload = {
  note_text: string
}

export type UserNotePayload = {
  content: string
}

export type DoctorApplicationPayload = {
  email: string
  password: string
  first_name: string
  last_name: string
  phone: string
  address: string
  specialization: string
  clinic_name: string
  consultation_fee: number
  experience_years: number
  license_number: string
  documents_url: string
}

export type ApproveDoctorApplicationPayload = {
  role?: MedBookRole
}

export type RejectDoctorApplicationPayload = {
  reason?: string
  review_comment?: string
}

export type ReviewDoctorApplicationPayload = {
  review_comment?: string
}

export class ApiHttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiHttpError'
  }
}

export function isApiHttpError(error: unknown, status?: number) {
  if (!(error instanceof ApiHttpError)) {
    return false
  }

  if (typeof status !== 'number') {
    return true
  }

  return error.status === status
}

const defaultBaseUrl = 'http://localhost:8080'
type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | undefined

export function setUnauthorizedHandler(handler?: UnauthorizedHandler) {
  unauthorizedHandler = handler
}

function getBaseUrl() {
  if (import.meta.env.DEV) {
    return ''
  }

  return import.meta.env.VITE_API_BASE_URL?.trim() || defaultBaseUrl
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      if (response.status === 401) {
        unauthorizedHandler?.()
      }

      let message = `MedBook API request failed: ${response.status}`

      try {
        const body = (await response.json()) as Record<string, unknown>
        const apiMessage =
          (typeof body.message === 'string' && body.message) ||
          (typeof body.error === 'string' && body.error) ||
          ''

        if (apiMessage) {
          message = apiMessage
        }
      } catch {
        // Ignore JSON parse issues and keep default error message.
      }

      throw new ApiHttpError(response.status, message)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function requireToken(token: string) {
  if (!token) {
    throw new Error('Authentication required')
  }
}

function authHeaders(token: string) {
  requireToken(token)

  return {
    Authorization: `Bearer ${token}`,
  }
}

export const medBookApi = {
  health: () => request<{ status?: string }>('/health', { method: 'GET' }),
  registerClient: (payload: RegisterPayload) =>
    request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  submitDoctorApplication: (payload: DoctorApplicationPayload) =>
    request('/api/v1/doctor-applications/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listAdminDoctorApplications: (token: string) =>
    request('/api/v1/admin/doctor-applications', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getDoctorApplicationStatus: (applicationId: string) =>
    request(`/api/v1/doctor-applications/${applicationId}`, {
      method: 'GET',
    }),
  getAdminDoctorApplication: (token: string, applicationId: string) =>
    request(`/api/v1/admin/doctor-applications/${applicationId}`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  approveAdminDoctorApplication: (
    token: string,
    applicationId: string,
    payload: ApproveDoctorApplicationPayload & ReviewDoctorApplicationPayload = { review_comment: 'approved from MedBook UI' },
  ) =>
    request(`/api/v1/admin/doctor-applications/${applicationId}/approve`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  rejectAdminDoctorApplication: (
    token: string,
    applicationId: string,
    payload: RejectDoctorApplicationPayload = { review_comment: 'rejected from MedBook UI' },
  ) =>
    request(`/api/v1/admin/doctor-applications/${applicationId}/reject`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  requestAdminDoctorApplicationReReview: (
    token: string,
    applicationId: string,
    payload: ReviewDoctorApplicationPayload = { review_comment: 'please re-check the documents' },
  ) =>
    request(`/api/v1/admin/doctor-applications/${applicationId}/re-review`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  listAdminDoctorApplicationDecisions: (token: string, applicationId: string) =>
    request(`/api/v1/admin/doctor-applications/${applicationId}/decisions`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  registerByAdmin: (token: string, payload: RegisterPayload) =>
    request('/api/v1/auth/register-by-admin', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }),
  login: (payload: LoginPayload) =>
    request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listDoctors: () => request('/api/v1/doctors', { method: 'GET' }),
  createAppointment: (token: string, payload: unknown) =>
    request('/api/v1/appointments/', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  listAppointments: (token: string) =>
    request('/api/v1/appointments/', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  cancelAppointment: (token: string, appointmentId: string) =>
    request(`/api/v1/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      headers: authHeaders(token),
    }),
  getVisitCard: (token: string, appointmentId: string) =>
    request(`/api/v1/appointments/${appointmentId}/card`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getAppointmentTransparency: (token: string, appointmentId: string) =>
    request(`/api/v1/appointments/${appointmentId}/transparency`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getPreVisitForm: (token: string, appointmentId: string) =>
    request(`/api/v1/appointments/${appointmentId}/pre-visit`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  upsertPreVisitForm: (token: string, appointmentId: string, payload: unknown) =>
    request(`/api/v1/appointments/${appointmentId}/pre-visit`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  getPreparationChecklist: (token: string, appointmentId: string) =>
    request(`/api/v1/appointments/${appointmentId}/preparation-checklist`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  confirmAppointmentByPatient: (token: string, appointmentId: string) =>
    request(`/api/v1/appointments/${appointmentId}/confirm`, {
      method: 'PATCH',
      headers: authHeaders(token),
    }),
  rescheduleAppointment: (token: string, appointmentId: string, payload: unknown) =>
    request(`/api/v1/appointments/${appointmentId}/reschedule`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  getFollowUp: (token: string, appointmentId: string) =>
    request(`/api/v1/appointments/${appointmentId}/follow-up`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  updateFollowUpProgress: (token: string, appointmentId: string, payload: unknown) =>
    request(`/api/v1/appointments/${appointmentId}/follow-up/progress`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  submitAppointmentFeedback: (token: string, appointmentId: string, payload: unknown) =>
    request(`/api/v1/appointments/${appointmentId}/feedback`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  listAppointmentChat: (token: string, appointmentId: string) =>
    request(`/api/v1/appointments/${appointmentId}/chat`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  sendAppointmentChatMessage: (token: string, appointmentId: string, payload: unknown) =>
    request(`/api/v1/appointments/${appointmentId}/chat`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  listDoctorAppointments: (token: string) =>
    request('/api/v1/doctor/appointments/', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  listDoctorAppointmentsFiltered: (token: string, query = 'status=confirmed&period=today') =>
    request(`/api/v1/doctor/appointments/?${query}`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  listPatients: (token: string) =>
    request('/api/v1/patients', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getUserNotes: (token: string) =>
    request('/api/v1/notes', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  updateUserNotes: (token: string, payload: UserNotePayload) =>
    request('/api/v1/notes', {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  getAppointmentNote: (token: string, appointmentId: string) =>
    request(`/api/v1/appointments/${appointmentId}/notes`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getDoctorAppointmentNote: (token: string, appointmentId: string) =>
    request(`/api/v1/doctor/appointments/${appointmentId}/notes`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getDoctorAppointmentChat: (token: string, appointmentId: string) =>
    request(`/api/v1/doctor/appointments/${appointmentId}/chat`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  sendDoctorAppointmentChatMessage: (token: string, appointmentId: string, payload: unknown) =>
    request(`/api/v1/doctor/appointments/${appointmentId}/chat`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  getDoctorFollowUp: (token: string, appointmentId: string) =>
    request(`/api/v1/doctor/appointments/${appointmentId}/follow-up`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  upsertDoctorFollowUp: (token: string, appointmentId: string, payload: unknown) =>
    request(`/api/v1/doctor/appointments/${appointmentId}/follow-up`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  getDoctorAppointmentCard: (token: string, appointmentId: string) =>
    request(`/api/v1/doctor/appointments/${appointmentId}/card`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  upsertDoctorAppointmentCard: (token: string, appointmentId: string, payload: unknown) =>
    request(`/api/v1/doctor/appointments/${appointmentId}/card`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  createDoctorAppointmentNote: (token: string, appointmentId: string, payload: AppointmentNotePayload) =>
    request(`/api/v1/doctor/appointments/${appointmentId}/notes`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  updateDoctorAppointmentNote: (token: string, appointmentId: string, payload: AppointmentNotePayload) =>
    request(`/api/v1/doctor/appointments/${appointmentId}/notes`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  confirmAppointment: (token: string, appointmentId: string) =>
    request(`/api/v1/doctor/appointments/${appointmentId}/confirm`, {
      method: 'PATCH',
      headers: authHeaders(token),
    }),
  completeAppointment: (token: string, appointmentId: string) =>
    request(`/api/v1/doctor/appointments/${appointmentId}/complete`, {
      method: 'PATCH',
      headers: authHeaders(token),
    }),
  getProfile: (token: string) =>
    request('/api/v1/profile', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  updateMedicalProfile: (token: string, payload: unknown) =>
    request('/api/v1/profile/medical', {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  updateDoctorProfessionalProfile: (token: string, payload: unknown) =>
    request('/api/v1/profile', {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  getHealthDashboard: (token: string) =>
    request('/api/v1/health-dashboard', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getPrivacySummary: (token: string) =>
    request('/api/v1/privacy', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getDoctorSchedule: (token: string) =>
    request('/api/v1/doctor/schedule/', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  replaceWorkingHours: (token: string, payload: unknown) =>
    request('/api/v1/doctor/schedule/working-hours', {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  replaceBreaks: (token: string, payload: unknown) =>
    request('/api/v1/doctor/schedule/breaks', {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  getWeekSlots: (token: string, weekStart: string) =>
    request(`/api/v1/doctor/schedule/week-slots?week_start=${encodeURIComponent(weekStart)}`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  replaceWeekSlots: (token: string, payload: unknown) =>
    request('/api/v1/doctor/schedule/week-slots', {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  addVacation: (token: string, payload: unknown) =>
    request('/api/v1/doctor/schedule/vacations', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  deleteVacation: (token: string, vacationId: string) =>
    request(`/api/v1/doctor/schedule/vacations/${vacationId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),
  upsertScheduleException: (token: string, date: string, payload: unknown) =>
    request(`/api/v1/doctor/schedule/exceptions/${date}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  deleteScheduleException: (token: string, date: string) =>
    request(`/api/v1/doctor/schedule/exceptions/${date}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),
  getPatientClinicalSummary: (token: string, patientId: string) =>
    request(`/api/v1/patients/${patientId}/clinical-summary`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getPatientDocumentTemplates: (token: string, patientId: string) =>
    request(`/api/v1/patients/${patientId}/document-templates`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getPatientChecklists: (token: string, specialization: string) =>
    request(`/api/v1/patients/checklists?specialization=${encodeURIComponent(specialization)}`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  searchUserNotes: (token: string, query: string) =>
    request(`/api/v1/notes/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  listNoteTemplates: (token: string) =>
    request('/api/v1/notes/templates', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  autosaveUserNotes: (token: string, payload: UserNotePayload) =>
    request('/api/v1/notes/autosave', {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  listCommunicationAutoReplies: (token: string) =>
    request('/api/v1/communication/auto-replies', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  listNotifications: (token: string) =>
    request('/api/v1/notifications', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getUnreadNotificationsCount: (token: string) =>
    request('/api/v1/notifications/unread-count', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  markNotificationAsRead: (token: string, notificationId: string) =>
    request(`/api/v1/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: authHeaders(token),
    }),
  markAllNotificationsAsRead: (token: string) =>
    request('/api/v1/notifications/read-all', {
      method: 'PATCH',
      headers: authHeaders(token),
    }),
  deleteNotification: (token: string, notificationId: string) =>
    request(`/api/v1/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),
  submitComplaint: (token: string, payload: unknown) =>
    request('/api/v1/complaints', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  listMyComplaints: (token: string) =>
    request('/api/v1/complaints/mine', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  listAdminComplaints: (token: string) =>
    request('/api/v1/admin/complaints', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getAdminComplaint: (token: string, complaintId: string) =>
    request(`/api/v1/admin/complaints/${complaintId}`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  resolveAdminComplaint: (token: string, complaintId: string, payload: unknown) =>
    request(`/api/v1/admin/complaints/${complaintId}/resolve`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  blockUser: (token: string, userId: string, payload: unknown) =>
    request(`/api/v1/admin/users/block?user_id=${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  unblockUser: (token: string, userId: string) =>
    request(`/api/v1/admin/users/unblock?user_id=${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: authHeaders(token),
    }),
  changeUserRole: (token: string, userId: string, payload: unknown) =>
    request(`/api/v1/admin/users/role?user_id=${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  getAdminActivityLogs: (token: string) =>
    request('/api/v1/admin/activity-logs', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getAdminStatistics: (token: string) =>
    request('/api/v1/admin/statistics', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getRecentAdminStatistics: (token: string) =>
    request('/api/v1/admin/statistics/recent', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  listClinics: () => request('/api/v1/clinics', { method: 'GET' }),
  createAdminClinic: (token: string, payload: unknown) =>
    request('/api/v1/admin/clinics', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  listAdminClinics: (token: string) =>
    request('/api/v1/admin/clinics', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getAdminClinic: (token: string, clinicId: string) =>
    request(`/api/v1/admin/clinics/${clinicId}`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  updateAdminClinic: (token: string, clinicId: string, payload: unknown) =>
    request(`/api/v1/admin/clinics/${clinicId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  deactivateAdminClinic: (token: string, clinicId: string) =>
    request(`/api/v1/admin/clinics/${clinicId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),
  listSpecializations: () => request('/api/v1/specializations', { method: 'GET' }),
  createAdminSpecialization: (token: string, payload: unknown) =>
    request('/api/v1/admin/specializations', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  listAdminSpecializations: (token: string) =>
    request('/api/v1/admin/specializations', {
      method: 'GET',
      headers: authHeaders(token),
    }),
  getAdminSpecialization: (token: string, specializationId: string) =>
    request(`/api/v1/admin/specializations/${specializationId}`, {
      method: 'GET',
      headers: authHeaders(token),
    }),
  updateAdminSpecialization: (token: string, specializationId: string, payload: unknown) =>
    request(`/api/v1/admin/specializations/${specializationId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
}
