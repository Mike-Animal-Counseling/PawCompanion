import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage, fieldErrors, uploadImage } from '../../lib/api';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ageFromMonths, formatCurrency, speciesLabel } from '../../lib/format';
import { SPECIES_OPTIONS } from '../../lib/constants';
import Icon from '../../components/Icon';
import { PageLoader } from '../../components/Feedback';
import classes from './MerchantListingFormPage.module.css';

const EMPTY = {
  name: '',
  species: 'cat',
  breed: '',
  ageMonths: 24,
  gender: 'unknown',
  size: 'medium',
  price: 45,
  description: '',
  personality: '',
  tags: '',
  imageUrl: '',
  city: '',
  energyLevel: 3,
  goodWithKids: false,
  goodWithPets: false,
  vaccinated: true,
  neutered: false,
  visibility: 'public',
  isActive: true,
};

const SPECIES = SPECIES_OPTIONS.filter((option) => option.value);

export default function MerchantListingFormPage() {
  const { animalId } = useParams();
  const editing = Boolean(animalId);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const { data: existing, loading } = useFetch(editing ? `/api/merchant/animals/${animalId}` : null, { enabled: editing });
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useDocumentTitle(editing ? `Edit ${existing?.name || 'listing'}` : 'Add a companion');

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || '',
        species: existing.species || 'cat',
        breed: existing.breed || '',
        ageMonths: existing.ageMonths ?? 24,
        gender: existing.gender || 'unknown',
        size: existing.size || 'medium',
        price: existing.price ?? 45,
        description: existing.description || '',
        personality: existing.personality || '',
        tags: (existing.tags || []).join(', '),
        imageUrl: existing.imageUrl || '',
        city: existing.city || user?.city || '',
        energyLevel: existing.energyLevel || 3,
        goodWithKids: Boolean(existing.goodWithKids),
        goodWithPets: Boolean(existing.goodWithPets),
        vaccinated: Boolean(existing.vaccinated),
        neutered: Boolean(existing.neutered),
        visibility: existing.visibility || 'public',
        isActive: existing.isActive !== false,
      });
    } else {
      setForm((current) => ({ ...current, city: current.city || user?.city || '' }));
    }
  }, [existing, user]);

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const onUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Use a JPG or PNG image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Images must be smaller than 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadImage(file);
      setForm((current) => ({ ...current, imageUrl: result.imageUrl }));
      toast.success('Photo uploaded.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not upload that image.'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Give the companion a name.';
    if (!(Number(form.price) > 0)) next.price = 'Set an hourly price.';
    if (!form.imageUrl) next.imageUrl = 'Add a photo.';
    if (form.personality.trim().length < 8) next.personality = 'A short, specific personality note helps guests.';
    setErrors(next);
    if (Object.keys(next).length) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim(),
      ageMonths: Number(form.ageMonths) || 0,
      gender: form.gender,
      size: form.size,
      price: Number(form.price),
      description: form.description.trim(),
      personality: form.personality.trim(),
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
      imageUrl: form.imageUrl.trim(),
      city: form.city.trim(),
      energyLevel: Number(form.energyLevel),
      goodWithKids: form.goodWithKids,
      goodWithPets: form.goodWithPets,
      vaccinated: form.vaccinated,
      neutered: form.neutered,
      visibility: form.visibility,
      isActive: form.isActive,
    };

    try {
      if (editing) await api.patch(`/api/merchant/animals/${animalId}`, payload);
      else await api.post('/api/merchant/animals', payload);
      toast.success(editing ? 'Listing updated.' : `${payload.name} is live.`);
      navigate('/merchant/listings');
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err, 'Could not save this listing.'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (editing && loading) return <PageLoader label="Loading listing…" />;

  return (
    <div className={classes.page}>
      <div className={classes.head}>
        <div>
          <Link to="/merchant/listings" className={classes.back}><Icon name="arrow-left" size={15} /> All listings</Link>
          <h1>{editing ? `Edit ${form.name || 'listing'}` : 'Add a companion'}</h1>
          <p>Honest, specific listings convert better and attract the right guests.</p>
        </div>
        {editing && <Link to={`/companions/${animalId}`} className="btn btn-secondary">View public page</Link>}
      </div>

      {error && <div className="notice notice-danger"><Icon name="alert" size={17} /><span>{error}</span></div>}

      <form onSubmit={submit} className={classes.layout}>
        <div className={classes.formColumn}>
          <section className={classes.panel}>
            <div className={classes.panelHead}>
              <span className={classes.sectionNumber}>01</span>
              <div><h2>Basics</h2><p>The details guests see first.</p></div>
            </div>
            <div className="form-grid">
              <div className={`field span-2 ${errors.name ? '' : ''}`}>
                <label className="label" htmlFor="animal-name">Name</label>
                <input id="animal-name" className="input" value={form.name} onChange={update('name')} placeholder="Mochi" maxLength={60} />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>
              <div className="field">
                <label className="label" htmlFor="animal-species">Species</label>
                <select id="animal-species" className="select" value={form.species} onChange={update('species')}>
                  {SPECIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="animal-breed">Breed</label>
                <input id="animal-breed" className="input" value={form.breed} onChange={update('breed')} placeholder="Domestic Shorthair" maxLength={80} />
              </div>
              <div className="field">
                <label className="label" htmlFor="animal-age">Age in months</label>
                <input id="animal-age" className="input" type="number" min="0" max="360" value={form.ageMonths} onChange={update('ageMonths')} />
                <span className="hint">{ageFromMonths(form.ageMonths)}</span>
              </div>
              <div className="field">
                <label className="label" htmlFor="animal-gender">Gender</label>
                <select id="animal-gender" className="select" value={form.gender} onChange={update('gender')}>
                  <option value="unknown">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="animal-size">Size</label>
                <select id="animal-size" className="select" value={form.size} onChange={update('size')}>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="animal-price">Price per hour (USD)</label>
                <input id="animal-price" className="input" type="number" min="0" max="5000" step="1" value={form.price} onChange={update('price')} />
                {errors.price && <span className="error-text">{errors.price}</span>}
                <span className="hint">Guests pay for a 2-hour minimum. An 8% service fee is added at checkout.</span>
              </div>
            </div>
          </section>

          <section className={classes.panel}>
            <div className={classes.panelHead}>
              <span className={classes.sectionNumber}>02</span>
              <div><h2>Personality &amp; story</h2><p>This becomes the AI companion’s voice and the profile copy.</p></div>
            </div>
            <div className="form-grid">
              <div className="field span-2">
                <label className="label" htmlFor="animal-personality">One-line personality</label>
                <input id="animal-personality" className="input" value={form.personality} onChange={update('personality')} maxLength={400} placeholder="Professional napper. Will supervise your work from the warmest spot." />
                {errors.personality && <span className="error-text">{errors.personality}</span>}
                <span className="hint">{form.personality.length}/400</span>
              </div>
              <div className="field span-2">
                <label className="label" htmlFor="animal-description">About this companion</label>
                <textarea id="animal-description" className="textarea" rows={6} value={form.description} onChange={update('description')} maxLength={3000} placeholder="History, temperament, what a first visit looks like, and anything a guest should know." />
                <span className="hint">{form.description.length}/3000</span>
              </div>
              <div className="field span-2">
                <label className="label" htmlFor="animal-tags">Tags</label>
                <input id="animal-tags" className="input" value={form.tags} onChange={update('tags')} placeholder="quiet, lap cat, apartment-friendly" />
                <span className="hint">Comma-separated, up to 8. These power discovery filters.</span>
              </div>
            </div>
          </section>

          <section className={classes.panel}>
            <div className={classes.panelHead}>
              <span className={classes.sectionNumber}>03</span>
              <div><h2>Practical details</h2><p>Helps guests decide if the fit is right.</p></div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="animal-city">City</label>
                <input id="animal-city" className="input" value={form.city} onChange={update('city')} placeholder="Portland" />
              </div>
              <div className="field">
                <label className="label" htmlFor="animal-energy">Energy level</label>
                <select id="animal-energy" className="select" value={form.energyLevel} onChange={update('energyLevel')}>
                  <option value="1">1 · Very calm</option>
                  <option value="2">2 · Calm</option>
                  <option value="3">3 · Balanced</option>
                  <option value="4">4 · Playful</option>
                  <option value="5">5 · Very active</option>
                </select>
              </div>
            </div>
            <div className={classes.toggles}>
              <label className="checkbox"><input type="checkbox" checked={form.goodWithKids} onChange={update('goodWithKids')} /><span>Comfortable around children</span></label>
              <label className="checkbox"><input type="checkbox" checked={form.goodWithPets} onChange={update('goodWithPets')} /><span>Can share space with other animals</span></label>
              <label className="checkbox"><input type="checkbox" checked={form.vaccinated} onChange={update('vaccinated')} /><span>Vaccinations up to date</span></label>
              <label className="checkbox"><input type="checkbox" checked={form.neutered} onChange={update('neutered')} /><span>Neutered / spayed</span></label>
            </div>
          </section>

          <section className={classes.panel}>
            <div className={classes.panelHead}>
              <span className={classes.sectionNumber}>04</span>
              <div><h2>Photo</h2><p>A real photo of the companion. No stock images, no people.</p></div>
            </div>
            <div className={classes.photoRow}>
              <div className={classes.photoPreview}>
                {form.imageUrl ? <img src={form.imageUrl} alt="Listing preview" /> : <span><Icon name="image" size={30} /></span>}
              </div>
              <div className={classes.photoControls}>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={onUpload} hidden id="animal-photo" />
                <label htmlFor="animal-photo" className="btn btn-secondary btn-sm">
                  <Icon name="upload" size={15} /> {uploading ? 'Uploading…' : 'Upload a photo'}
                </label>
                <span className="hint">JPG or PNG, up to 5 MB. Resized and stripped of metadata on upload.</span>
                <div className="field">
                  <label className="label" htmlFor="animal-image-url">Or paste an image URL</label>
                  <input id="animal-image-url" className="input" value={form.imageUrl} onChange={update('imageUrl')} placeholder="https://… or /uploads/…" />
                  {errors.imageUrl && <span className="error-text">{errors.imageUrl}</span>}
                </div>
              </div>
            </div>
          </section>

          <section className={classes.panel}>
            <div className={classes.panelHead}>
              <span className={classes.sectionNumber}>05</span>
              <div><h2>Visibility</h2><p>Pause a listing without losing its history.</p></div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="animal-visibility">Public visibility</label>
                <select id="animal-visibility" className="select" value={form.visibility} onChange={update('visibility')}>
                  <option value="public">Public — discoverable</option>
                  <option value="private">Private — paused</option>
                </select>
              </div>
              <label className="checkbox" style={{ alignSelf: 'end', paddingBottom: 12 }}>
                <input type="checkbox" checked={form.isActive} onChange={update('isActive')} />
                <span>Listing is active</span>
              </label>
            </div>
          </section>

          <div className={classes.formActions}>
            <Link to="/merchant/listings" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-lg" disabled={saving || uploading}>
              {saving ? 'Saving…' : editing ? 'Save listing' : 'Publish listing'}
            </button>
          </div>
        </div>

        <aside className={classes.previewColumn}>
          <div className={classes.previewSticky}>
            <span className={classes.previewLabel}>Live preview</span>
            <div className={classes.previewCard}>
              <div className={classes.previewImage}>
                {form.imageUrl ? <img src={form.imageUrl} alt="" /> : <span><Icon name="paw" size={34} /></span>}
                <span className="badge badge-dark"><Icon name="shield" size={11} /> {user?.verified ? 'Verified host' : 'New host'}</span>
              </div>
              <div className={classes.previewBody}>
                <h3>{form.name || 'Companion name'}</h3>
                <p>{speciesLabel(form.species)}{form.breed ? ` · ${form.breed}` : ''} · {ageFromMonths(form.ageMonths)}</p>
                <blockquote>{form.personality || 'A short personality note will appear here.'}</blockquote>
                <div className={classes.previewTags}>
                  {form.tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 3).map((tag) => <span key={tag} className="tag">{tag}</span>)}
                </div>
                <div className={classes.previewFooter}>
                  <span>{form.city || 'City'}</span>
                  <strong>{formatCurrency(Number(form.price) || 0)}<small>/hr</small></strong>
                </div>
              </div>
            </div>
            <div className="notice" style={{ fontSize: '0.72rem' }}>
              <Icon name="sparkles" size={16} />
              <span>The AI personality is generated from the species, personality note and tags. Guests can talk before booking.</span>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
