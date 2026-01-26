
import requests
import logging

logger = logging.getLogger(__name__)

class ExternalUserVerifier:
    """
    Handles verification of students/guardians against the bcps4core centralized API.
    """
    
    BASE_URL = "http://bcps4core.com/api/v1"
    API_KEY = "065c6b0ff2fd56be5bbb7bb45cef10dc22d97ddfbb0e4d23344a0b98d9df6140"
    
    @classmethod
    def _get_headers(cls):
        return {
            "x-api-key": cls.API_KEY,
            "Content-Type": "application/json"
        }

    @classmethod
    def get_student_by_id(cls, student_id):
        """
        Fetches student details by Student ID.
        Returns dict with student info if found, None otherwise.
        """
        try:
            # Note: Assuming the API supports filtering by ID via query param or direct path.
            # Based on standard REST structures, trying /students/{id} or ?student_id={id}
            # Since the user list showed /students, we'll try to search.
            
            # METHOD 1: Fetch all and filter (Slow but safe if no search endpoint)
            # METHOD 2: Direct lookup if supported.
            
            # Let's try searching via query param first as it's common
            url = f"{cls.BASE_URL}/students"
            response = requests.get(url, headers=cls._get_headers(), params={"student_id": student_id}, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                # Check if data is a list (search results) or dict
                if isinstance(data, list):
                    # Find exact match
                    for student in data:
                        # Normalize ID check
                        current_id = str(student.get('student_id') or student.get('id') or '')
                        if current_id == str(student_id):
                            return student
                    return None
                elif isinstance(data, dict):
                    # Check if response IS the student or a wrapper
                    if 'data' in data:
                        # Wrapper format
                        for student in data['data']:
                             current_id = str(student.get('student_id') or student.get('id') or '')
                             if current_id == str(student_id):
                                return student
                    return None
            else:
                logger.warning(f"External API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to connect to external verification API: {e}")
            return None

    @classmethod
    def verify_student_registration(cls, student_id):
        """
        Verifies if a student exists and returns normalized data for local registration.
        """
        student = cls.get_student_by_id(student_id)
        
        if not student:
            return {
                'valid': False,
                'message': 'Student ID not found in centralized database.'
            }
            
        # Parse fields (Adjust field names based on actual API response structure)
        # Assuming typical fields: first_name, last_name, course, section, year_level
        return {
            'valid': True,
            'message': 'Student Verified',
            'data': {
                'first_name': student.get('first_name', ''),
                'last_name': student.get('last_name', ''),
                'course': student.get('course', ''),
                'section': student.get('section', ''),
                'email': student.get('email', ''), # Optional
                'external_id': student.get('student_id', student_id)
            }
        }
