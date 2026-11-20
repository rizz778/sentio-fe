import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const initialTherapists = [
  {
    id: 1,
    name: "Dr. Hrithik Khandelwal",
    specialization: "Anxiety, Depression, Post Traumatic Stress Disorders",
    hourlyRate: 1500,
  },
  {
    id: 2,
    name: "Dr. Smita Chauhan",
    specialization: "Trauma, Panic Disorders, Grief Counseling",
    hourlyRate: 1800,
  },
  {
    id: 3,
    name: "Dr. Ritika Hemrajani",
    specialization: "Relationship Issues, Family Therapy",
    hourlyRate: 1600,
  },
  {
    id: 4,
    name: "Dr. Rohit Saxena",
    specialization: "Parenting Issues, Daily Life Issues",
    hourlyRate: 1400,
  },
];

const TherapistBookingPage = () => {
  const [therapists] = useState(initialTherapists);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [userAppointments, setUserAppointments] = useState(() => {
    try {
      const saved = localStorage.getItem('sentio_appointments');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sentio_appointments', JSON.stringify(userAppointments));
    } catch (e) {
      console.error('Failed to save appointments:', e);
    }
  }, [userAppointments]);

  const handleTherapistSelect = (therapist) => {
    setSelectedTherapist(therapist);
    setSuccessMessage('');
  };

  const handleBookAppointment = (e) => {
    e.preventDefault();

    if (!selectedTherapist || !selectedDate || !startTime || !endTime) {
      return;
    }

    const startDateTime = new Date(`${selectedDate}T${startTime}`);
    const endDateTime = new Date(`${selectedDate}T${endTime}`);

    if (startDateTime >= endDateTime) {
      alert("End time must be after start time");
      return;
    }

    const newAppointment = {
      id: Date.now(),
      therapistId: selectedTherapist.id,
      therapistName: selectedTherapist.name,
      specialization: selectedTherapist.specialization,
      date: selectedDate,
      startTime: `${selectedDate}T${startTime}`,
      endTime: `${selectedDate}T${endTime}`,
      isCancelled: false,
      bookedAt: new Date().toISOString(),
    };

    setUserAppointments((prev) => [newAppointment, ...prev]);
    setSuccessMessage(`Appointment booked successfully with ${selectedTherapist.name}!`);
    setSelectedDate('');
    setStartTime('');
    setEndTime('');
  };

  const handleCancelAppointment = (appointmentId) => {
    setUserAppointments((prev) =>
      prev.map((app) => (app.id === appointmentId ? { ...app, isCancelled: true } : app))
    );
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Therapist Booking System</h1>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Therapist List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Available Therapists</h2>
          <ul className="divide-y divide-gray-100">
            {therapists.map((therapist) => (
              <li
                key={therapist.id}
                className={`py-4 px-3 rounded-lg cursor-pointer transition-colors ${
                  selectedTherapist?.id === therapist.id
                    ? 'bg-pink-50 border border-pink-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleTherapistSelect(therapist)}
              >
                <h3 className="text-lg font-medium text-gray-900">{therapist.name}</h3>
                <p className="text-sm text-gray-600">{therapist.specialization}</p>
                <p className="text-sm font-semibold text-pink-600 mt-1">₹{therapist.hourlyRate} / hour</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Middle Column - Booking Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Book an Appointment</h2>

          {selectedTherapist ? (
            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div className="p-3 bg-pink-50/50 rounded-lg border border-pink-100">
                <p className="text-xs text-gray-500 uppercase font-medium">Selected Specialist</p>
                <p className="font-semibold text-gray-900">{selectedTherapist.name}</p>
                <p className="text-sm text-pink-600 font-medium">₹{selectedTherapist.hourlyRate} / hour</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  min={today}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:outline-none"
                  required
                />
              </div>

              {startTime && endTime && selectedDate && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <span className="text-gray-500">Estimated Total: </span>
                  {(() => {
                    try {
                      const start = new Date(`${selectedDate}T${startTime}`);
                      const end = new Date(`${selectedDate}T${endTime}`);
                      const hours = Math.max(1, (end - start) / (1000 * 60 * 60));
                      const total = hours * selectedTherapist.hourlyRate;
                      return <span className="font-bold text-gray-900">₹{Math.round(total)}</span>;
                    } catch {
                      return <span>Select valid times</span>;
                    }
                  })()}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#f64a8a] hover:bg-pink-600 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-sm"
              >
                Confirm Booking
              </button>
            </form>
          ) : (
            <p className="text-gray-500 text-sm">Please select a therapist from the left to book.</p>
          )}
        </div>

        {/* Right Column - User's Appointments */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Appointments</h2>

          {userAppointments.length > 0 ? (
            <ul className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {userAppointments.map((appointment) => (
                <li key={appointment.id} className="py-3">
                  <h3 className="font-medium text-gray-900">{appointment.therapistName}</h3>
                  <p className="text-xs text-gray-500">
                    {format(new Date(appointment.startTime), 'MMM dd, yyyy')} |{' '}
                    {format(new Date(appointment.startTime), 'h:mm a')} -{' '}
                    {format(new Date(appointment.endTime), 'h:mm a')}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        appointment.isCancelled
                          ? 'bg-red-50 text-red-600'
                          : 'bg-green-50 text-green-600'
                      }`}
                    >
                      {appointment.isCancelled ? 'Cancelled' : 'Confirmed'}
                    </span>
                    {!appointment.isCancelled && (
                      <button
                        onClick={() => handleCancelAppointment(appointment.id)}
                        className="text-xs text-red-500 hover:text-red-700 underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">You have no booked appointments yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TherapistBookingPage;
