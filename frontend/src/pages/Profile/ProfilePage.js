import React, { useState, useEffect } from "react";
import classes from "./profilePage.module.css";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    name: "Mr.Liang",
    email: "liang@example.com",
    phone: "+1 (555) 123-4567",
    address: "123 Pet Street, Animal City, AC 12345",
    joinDate: "January 2024",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    setProfile(formData);
    setIsEditing(false);
    // TODO: Save to backend API
  };

  const handleCancel = () => {
    setFormData(profile);
    setIsEditing(false);
  };

  return (
    <div className={classes.profileContainer}>
      <h1>My Profile</h1>

      <div className={classes.profileCard}>
        <div className={classes.profileHeader}>
          <div className={classes.avatarContainer}>
            <div className={classes.avatar}>
              {profile.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className={classes.profileInfo}>
            <h2>{profile.name}</h2>
            <p>Member since {profile.joinDate}</p>
          </div>
        </div>

        <div className={classes.profileDetails}>
          {isEditing ? (
            <form className={classes.editForm}>
              <div className={classes.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className={classes.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              <div className={classes.formGroup}>
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              <div className={classes.formGroup}>
                <label>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>

              <div className={classes.formActions}>
                <button
                  type="button"
                  className={classes.saveBtn}
                  onClick={handleSave}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  className={classes.cancelBtn}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className={classes.viewMode}>
              <div className={classes.detailItem}>
                <span className={classes.label}>Email:</span>
                <span className={classes.value}>{profile.email}</span>
              </div>

              <div className={classes.detailItem}>
                <span className={classes.label}>Phone:</span>
                <span className={classes.value}>{profile.phone}</span>
              </div>

              <div className={classes.detailItem}>
                <span className={classes.label}>Address:</span>
                <span className={classes.value}>{profile.address}</span>
              </div>

              <button
                className={classes.editBtn}
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
