/**
 * Validation helpers for request data
 */

// Email regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 * @param {string} email
 * @returns {object} {valid: boolean, error: string|null}
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, error: 'Email cannot be empty' };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Email format is invalid' };
  }
  return { valid: true, error: null };
}

/**
 * Validate password length
 * @param {string} password
 * @param {number} minLength
 * @returns {object} {valid: boolean, error: string|null}
 */
function validatePassword(password, minLength = 6) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < minLength) {
    return { valid: false, error: `Password must be at least ${minLength} characters` };
  }
  return { valid: true, error: null };
}

/**
 * Validate required string field
 * @param {string} value
 * @param {string} fieldName
 * @returns {object} {valid: boolean, error: string|null}
 */
function validateRequired(value, fieldName) {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} is required` };
  }
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }
  return { valid: true, error: null };
}

/**
 * Validate signup data
 * @param {object} data - {name, email, password}
 * @returns {object} {valid: boolean, errors: []}
 */
function validateSignup(data) {
  const errors = [];

  // Validate name
  const nameValidation = validateRequired(data.name, 'Name');
  if (!nameValidation.valid) errors.push(nameValidation.error);

  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) errors.push(emailValidation.error);

  // Validate password
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) errors.push(passwordValidation.error);

  return {
    valid: errors.length === 0,
    errors,
    data: {
      name: data.name?.trim(),
      email: data.email?.trim().toLowerCase(),
      password: data.password
    }
  };
}

/**
 * Validate login data
 * @param {object} data - {email, password}
 * @returns {object} {valid: boolean, errors: []}
 */
function validateLogin(data) {
  const errors = [];

  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) errors.push(emailValidation.error);

  // Validate password (just require it exists)
  const passwordValidation = validatePassword(data.password, 1);
  if (!passwordValidation.valid) errors.push(passwordValidation.error);

  return {
    valid: errors.length === 0,
    errors,
    data: {
      email: data.email?.trim().toLowerCase(),
      password: data.password
    }
  };
}

/**
 * Validate project creation
 * @param {object} data - {name, description, color}
 * @returns {object} {valid: boolean, errors: []}
 */
function validateProject(data) {
  const errors = [];

  // Validate name (required)
  const nameValidation = validateRequired(data.name, 'Project name');
  if (!nameValidation.valid) errors.push(nameValidation.error);

  // Validate description (optional, but trim if provided)
  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  }

  // Validate color (optional, but format check if provided)
  if (data.color && typeof data.color !== 'string') {
    errors.push('Color must be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      name: data.name?.trim(),
      description: data.description?.trim() || '',
      color: data.color || '#6366f1'
    }
  };
}

/**
 * Validate task creation
 * @param {object} data - {title, description, priority, project_id, assignee_id, due_date}
 * @returns {object} {valid: boolean, errors: []}
 */
function validateTask(data) {
  const errors = [];

  // Validate title (required)
  const titleValidation = validateRequired(data.title, 'Task title');
  if (!titleValidation.valid) errors.push(titleValidation.error);

  // Validate project_id (required)
  if (!data.project_id) {
    errors.push('Project ID is required');
  }

  // Validate description (optional)
  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  }

  // Validate priority (optional)
  if (data.priority && !['low', 'medium', 'high', 'critical'].includes(data.priority)) {
    errors.push('Priority must be one of: low, medium, high, critical');
  }

  // Validate status (optional)
  if (data.status && !['assigned', 'in_progress', 'completed'].includes(data.status)) {
    errors.push('Status must be one of: assigned, in_progress, completed');
  }

  // Validate due_date (optional)
  if (data.due_date && isNaN(new Date(data.due_date).getTime())) {
    errors.push('Due date must be a valid date');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      title: data.title?.trim(),
      description: data.description?.trim() || '',
      priority: data.priority || 'medium',
      status: data.status || 'assigned',
      project_id: data.project_id,
      assignee_id: data.assignee_id || null,
      due_date: data.due_date || null
    }
  };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateRequired,
  validateSignup,
  validateLogin,
  validateProject,
  validateTask
};
