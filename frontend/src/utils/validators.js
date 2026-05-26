const nameRegex = /^[a-zA-Z\s\-']+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/; // exactly 10 digits

export const validateName = (name) => {
  const trimmed = name?.trim() || '';
  if (!trimmed) return 'Full name is required';
  if (trimmed.length < 2) return 'Full name must be at least 2 characters';
  if (trimmed.length > 50) return 'Full name must not exceed 50 characters';
  if (!nameRegex.test(trimmed)) return 'Full name can only contain letters, spaces, hyphens, and apostrophes';
  return '';
};

export const validatePhone = (phone) => {
  const trimmed = phone?.trim() || '';
  if (!trimmed) return 'Phone number is required';
  if (!phoneRegex.test(trimmed)) return 'Phone number must be exactly 10 digits';
  return '';
};

export const validateEmail = (email) => {
  if (!email || email.trim() === '') return '';
  const trimmed = email.trim();
  if (!emailRegex.test(trimmed)) return 'Please enter a valid email address';
  if (trimmed.length > 100) return 'Email address is too long';
  return '';
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password must not exceed 128 characters';
  // Only enforcing minimum length here per request
  return '';
};

export const validateRegistration = (name, phone, email, password, confirmPassword) => {
  const errors = {};
  const nameError = validateName(name);
  if (nameError) errors.name = nameError;
  const phoneError = validatePhone(phone);
  if (phoneError) errors.phone = phoneError;
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;
  if (confirmPassword !== undefined) {
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
};

export const validateLogin = (phone, password) => {
  const errors = {};
  const phoneError = validatePhone(phone);
  if (phoneError) errors.phone = phoneError;
  if (!password) {
    errors.password = 'Password is required';
  }
  return { valid: Object.keys(errors).length === 0, errors };
};

export const validateProfile = (name, email, password) => {
  const errors = {};
  const nameError = validateName(name);
  if (nameError) errors.name = nameError;
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (password && validatePassword(password)) {
    errors.password = validatePassword(password);
  }
  return { valid: Object.keys(errors).length === 0, errors };
};

export const validateUserForm = (name, phone, email, password, requirePassword = false) => {
  const errors = {};
  const nameError = validateName(name);
  if (nameError) errors.name = nameError;
  const phoneError = validatePhone(phone);
  if (phoneError) errors.phone = phoneError;
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (requirePassword || password) {
    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;
  }
  return { valid: Object.keys(errors).length === 0, errors };
};

export const validateRowForm = (rowLetter, seatsCount) => {
  const errors = {};
  const letter = rowLetter?.trim().toUpperCase() || '';
  if (!letter) {
    errors.rowLetter = 'Row letter is required';
  } else if (!/^[A-Z]$/.test(letter)) {
    errors.rowLetter = 'Row letter must be a single letter A-Z';
  }

  const count = Number(seatsCount);
  if (!seatsCount && seatsCount !== 0) {
    errors.seatsCount = 'Seat count is required';
  } else if (Number.isNaN(count) || count < 1 || count > 30) {
    errors.seatsCount = 'Seat count must be a number between 1 and 30';
  }
  return { valid: Object.keys(errors).length === 0, errors, clean: { rowLetter: letter, seatsCount: count } };
};
