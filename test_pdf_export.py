#!/usr/bin/env python3
"""Test PDF export functionality"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from io import BytesIO
    
    print("✅ ReportLab imported successfully!")
    
    # Test PDF generation
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    
    story = [
        Paragraph("Test PDF Export", styles['Title']),
        Spacer(1, 12),
        Paragraph("This is a test to verify PDF generation works correctly.", styles['Normal'])
    ]
    
    doc.build(story)
    print(f"✅ Test PDF generated successfully! Size: {len(buffer.getvalue())} bytes")
    print("\n🎉 PDF export functionality is ready!")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please install reportlab: pip install reportlab")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
