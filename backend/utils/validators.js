// Validation utilities for user registration and login

// Validate name
export const validateName = (name) => {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return { valid: false, message: 'Full name is required' };
  }
  
  if (trimmed.length < 2) {
    return { valid: false, message: 'Full name must be at least 2 characters' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, message: 'Full name must not exceed 50 characters' };
  }
  
  // Check if name contains only letters, spaces, and hyphens
  if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
    return { valid: false, message: 'Full name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { valid: true, message: '', value: trimmed };
};

// Validate phone number
export const validatePhone = (phone) => {
  const trimmed = phone.trim();
  
  if (!trimmed) {
    return { valid: false, message: 'Phone number is required' };
  }
  
  // Check if phone contains only digits
  if (!/^\d{10}$/.test(trimmed)) {
    return { valid: false, message: 'Phone number must be exactly 10 digits' };
  }
  
  return { valid: true, message: '', value: trimmed };
};

// Validate email
export const validateEmail = (email) => {
  // Email is optional, but if provided, must be valid
  if (!email || email.trim() === '') {
    return { valid: true, message: '', value: '' };
  }
  
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: 'Please enter a valid email address' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, message: 'Email address is too long' };
  }
  
  return { valid: true, message: '', value: trimmed };
};

// Validate password strength
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password is too long (max 128 characters)' };
  }
  
  return { valid: true, message: '', value: password };
};

// Validate all registration fields
export const validateRegistration = (name, phone, email, password) => {
  const errors = {};
  
  const nameValidation = validateName(name);
  if (!nameValidation.valid) {
    errors.name = nameValidation.message;
  }
  
  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) {
    errors.phone = phoneValidation.message;
  }
  
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.message;
  }
  
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.message;
  }
  
  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, message: 'Validation failed' };
  }
  
  return {
    valid: true,
    errors: {},
    message: '',
    cleanData: {
      name: nameValidation.value,
      phone: phoneValidation.value,
      email: emailValidation.value,
      password: passwordValidation.value
    }
  };
};

export const validateProfileUpdate = (name, email, password) => {
  const errors = {};

  if (name !== undefined) {
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      errors.name = nameValidation.message;
    }
  }

  if (email !== undefined) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      errors.email = emailValidation.message;
    }
  }

  if (password) {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.message;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, message: 'Validation failed' };
  }

  return {
    valid: true,
    errors: {},
    message: '',
    cleanData: {
      name: name ? name.trim() : undefined,
      email: email !== undefined ? email.trim() : undefined,
      password: password || undefined
    }
  };
};

export const validateAdminUser = (name, phone, email, password, requirePassword = false) => {
  const errors = {};

  const nameValidation = validateName(name);
  if (!nameValidation.valid) {
    errors.name = nameValidation.message;
  }

  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) {
    errors.phone = phoneValidation.message;
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.message;
  }

  if (requirePassword || password) {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.message;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, message: 'Validation failed' };
  }

  return {
    valid: true,
    errors: {},
    message: '',
    cleanData: {
      name: nameValidation.value,
      phone: phoneValidation.value,
      email: emailValidation.value,
      password: password ? password : undefined
    }
  };
};
