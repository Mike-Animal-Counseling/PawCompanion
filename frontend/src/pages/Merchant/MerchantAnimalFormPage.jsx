import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import {
  createMerchantAnimal,
  deleteMerchantAnimalImage,
  getMerchantAnimal,
  updateMerchantAnimal,
  uploadMerchantAnimalImage,
} from "../../services/merchantService";
import classes from "./merchant.module.css";
import { resolveAnimalImageUrl } from "../../utils/imageUrl";

const emptyForm = {
  name: "",
  price: "",
  imageUrl: "",
  stars: "0",
  visibility: "public",
  favorite: false,
  origins: "",
  tags: "",
  personality: "",
};

export default function MerchantAnimalFormPage() {
  const { animalId } = useParams();
  const navigate = useNavigate();
  const { merchantToken } = useUser();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(animalId));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const imageInputRef = useRef(null);

  const isEdit = useMemo(() => Boolean(animalId), [animalId]);

  useEffect(() => {
    if (!animalId) {
      return;
    }

    const loadAnimal = async () => {
      try {
        const animal = await getMerchantAnimal(merchantToken, animalId);
        setForm({
          name: animal.name || "",
          price: String(animal.price ?? ""),
          imageUrl: animal.imageUrl || "",
          stars: String(animal.stars ?? 0),
          visibility: animal.visibility || "public",
          favorite: Boolean(animal.favorite),
          origins: animal.origins?.join(", ") || "",
          tags: animal.tags?.join(", ") || "",
          personality: animal.personality || "",
        });
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load animal");
      } finally {
        setLoading(false);
      }
    };

    loadAnimal();
  }, [animalId, merchantToken]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSelectImage = async (event) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);

    if (!file) {
      return;
    }

    if (!merchantToken) {
      setError("Merchant session expired. Please log in again.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      const previousImageUrl = form.imageUrl;
      const result = await uploadMerchantAnimalImage(merchantToken, file);
      setForm((prev) => ({
        ...prev,
        imageUrl: result.imageUrl,
      }));

      if (previousImageUrl && previousImageUrl !== result.imageUrl) {
        try {
          await deleteMerchantAnimalImage(merchantToken, previousImageUrl);
        } catch (_cleanupError) {
          // Non-blocking cleanup: keep the new upload even if old file deletion fails.
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveUploadedImage = async () => {
    if (!form.imageUrl) {
      return;
    }

    try {
      setUploading(true);
      setError("");
      await deleteMerchantAnimalImage(merchantToken, form.imageUrl);
      setForm((prev) => ({
        ...prev,
        imageUrl: "",
      }));
      setSelectedFile(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stars: Number(form.stars),
        origins: form.origins
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        tags: form.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      if (isEdit) {
        await updateMerchantAnimal(merchantToken, animalId, payload);
      } else {
        await createMerchantAnimal(merchantToken, payload);
      }

      navigate("/merchant/animals");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save animal");
    } finally {
      setSaving(false);
    }
  };

  const isSubmitDisabled = saving || uploading;

  return (
    <div className={classes.page}>
      <div className={classes.hero}>
        <h1 className={classes.heroTitle}>
          {isEdit ? "Edit Animal" : "Create Animal"}
        </h1>
        <p className={classes.heroText}>
          Keep the public profile warm and client-friendly. Merchant identity
          stays hidden from customers.
        </p>
      </div>

      {error && <div className={classes.errorBox}>{error}</div>}

      <form className={classes.formCard} onSubmit={handleSubmit}>
        {loading ? (
          <div className={classes.emptyState}>Loading animal details...</div>
        ) : (
          <>
            <div className={classes.formGrid}>
              <div className={classes.formGroup}>
                <label className={classes.label} htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  className={classes.input}
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={classes.formGroup}>
                <label className={classes.label} htmlFor="price">
                  Price per hour
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  className={classes.input}
                  value={form.price}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={classes.formGroup}>
                <label className={classes.label} htmlFor="imageFile">
                  Animal Image (JPG/PNG)
                </label>
                <input
                  id="imageFile"
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className={classes.input}
                  onChange={handleSelectImage}
                  disabled={uploading}
                />
                {uploading && (
                  <span className={classes.smallText}>Uploading image...</span>
                )}
                {selectedFile && !uploading && (
                  <span className={classes.smallText}>
                    Selected file: {selectedFile.name}
                  </span>
                )}
                {form.imageUrl && (
                  <>
                    <img
                      src={resolveAnimalImageUrl(form.imageUrl)}
                      alt="Animal preview"
                      className={classes.imagePreview}
                    />
                    <div className={classes.actionsRow}>
                      <button
                        type="button"
                        className={classes.dangerButton}
                        onClick={handleRemoveUploadedImage}
                        disabled={uploading}
                      >
                        Delete current image
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className={classes.formGroup}>
                <label className={classes.label} htmlFor="stars">
                  Stars
                </label>
                <input
                  id="stars"
                  name="stars"
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  className={classes.input}
                  value={form.stars}
                  onChange={handleChange}
                />
              </div>

              <div className={classes.formGroup}>
                <label className={classes.label} htmlFor="visibility">
                  Visibility
                </label>
                <select
                  id="visibility"
                  name="visibility"
                  className={classes.select}
                  value={form.visibility}
                  onChange={handleChange}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className={classes.formGroup}>
                <label className={classes.label} htmlFor="favorite">
                  Feature this animal
                </label>
                <select
                  id="favorite"
                  name="favorite"
                  className={classes.select}
                  value={String(form.favorite)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      favorite: event.target.value === "true",
                    }))
                  }
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>

              <div className={classes.formGroup}>
                <label className={classes.label} htmlFor="origins">
                  Origins
                </label>
                <input
                  id="origins"
                  name="origins"
                  className={classes.input}
                  value={form.origins}
                  onChange={handleChange}
                  placeholder="Canada, Europe"
                />
              </div>

              <div className={classes.formGroup}>
                <label className={classes.label} htmlFor="tags">
                  Tags
                </label>
                <input
                  id="tags"
                  name="tags"
                  className={classes.input}
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="China, Friendly"
                />
              </div>

              <div className={`${classes.formGroup} ${classes.fullWidth}`}>
                <label className={classes.label} htmlFor="personality">
                  Personality
                </label>
                <textarea
                  id="personality"
                  name="personality"
                  className={classes.textarea}
                  value={form.personality}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={classes.actionsRow}>
              <button
                type="submit"
                className={classes.primaryButton}
                disabled={isSubmitDisabled}
              >
                {saving
                  ? "Saving..."
                  : isEdit
                    ? "Save Animal"
                    : "Create Animal"}
              </button>
              <Link to="/merchant/animals" className={classes.subtleButton}>
                Cancel
              </Link>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
