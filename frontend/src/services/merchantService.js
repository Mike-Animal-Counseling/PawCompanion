import axiosConfig from "../axiosConfig";

const withAuth = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export const merchantRegister = async (payload) => {
  const { data } = await axiosConfig.post(
    "/api/auth/merchant/register",
    payload,
  );
  return data;
};

export const merchantLogin = async (payload) => {
  const { data } = await axiosConfig.post("/api/auth/merchant/login", payload);
  return data;
};

export const getMerchantProfile = async (token) => {
  const { data } = await axiosConfig.get(
    "/api/auth/merchant/me",
    withAuth(token),
  );
  return data;
};

export const getMerchantDashboard = async (token) => {
  const { data } = await axiosConfig.get(
    "/api/merchant/dashboard",
    withAuth(token),
  );
  return data;
};

export const getMerchantAnimals = async (token) => {
  const { data } = await axiosConfig.get(
    "/api/merchant/animals",
    withAuth(token),
  );
  return data;
};

export const getMerchantAnimal = async (token, animalId) => {
  const { data } = await axiosConfig.get(
    `/api/merchant/animals/${animalId}`,
    withAuth(token),
  );
  return data;
};

export const createMerchantAnimal = async (token, payload) => {
  const { data } = await axiosConfig.post(
    "/api/merchant/animals",
    payload,
    withAuth(token),
  );
  return data;
};

export const uploadMerchantAnimalImage = async (token, file) => {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await axiosConfig.post(
    "/api/merchant/upload-image",
    formData,
    withAuth(token),
  );
  return data;
};

export const deleteMerchantAnimalImage = async (token, imageUrl) => {
  const { data } = await axiosConfig.delete("/api/merchant/upload-image", {
    ...withAuth(token),
    data: { imageUrl },
  });
  return data;
};

export const updateMerchantAnimal = async (token, animalId, payload) => {
  const { data } = await axiosConfig.put(
    `/api/merchant/animals/${animalId}`,
    payload,
    withAuth(token),
  );
  return data;
};

export const archiveMerchantAnimal = async (token, animalId) => {
  const { data } = await axiosConfig.delete(
    `/api/merchant/animals/${animalId}`,
    withAuth(token),
  );
  return data;
};

export const getMerchantAvailability = async (token, animalId, date) => {
  const { data } = await axiosConfig.get(
    `/api/merchant/animals/${animalId}/availability?date=${date}`,
    withAuth(token),
  );
  return data;
};

export const saveMerchantAvailability = async (token, animalId, payload) => {
  const { data } = await axiosConfig.put(
    `/api/merchant/animals/${animalId}/availability`,
    payload,
    withAuth(token),
  );
  return data;
};

export const getMerchantBookings = async (token, status = "") => {
  const suffix = status ? `?status=${status}` : "";
  const { data } = await axiosConfig.get(
    `/api/merchant/bookings${suffix}`,
    withAuth(token),
  );
  return data;
};

export const acceptMerchantBooking = async (token, bookingId, note) => {
  const { data } = await axiosConfig.patch(
    `/api/merchant/bookings/${bookingId}/accept`,
    { note },
    withAuth(token),
  );
  return data;
};

export const rejectMerchantBooking = async (token, bookingId, note) => {
  const { data } = await axiosConfig.patch(
    `/api/merchant/bookings/${bookingId}/reject`,
    { note },
    withAuth(token),
  );
  return data;
};

export const rescheduleMerchantBooking = async (token, bookingId, payload) => {
  const { data } = await axiosConfig.patch(
    `/api/merchant/bookings/${bookingId}/reschedule`,
    payload,
    withAuth(token),
  );
  return data;
};
