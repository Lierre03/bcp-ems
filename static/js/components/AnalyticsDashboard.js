// AnalyticsDashboard Component - Comprehensive analytics with charts
const { useState, useEffect, useRef } = React;

window.AnalyticsDashboard = function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Chart refs
  const statusChartRef = useRef(null);
  const typeChartRef = useRef(null);
  const feedbackChartRef = useRef(null);
  const trendsChartRef = useRef(null);

  // Chart instances
  const statusChartInstance = useRef(null);
  const typeChartInstance = useRef(null);
  const feedbackChartInstance = useRef(null);
  const trendsChartInstance = useRef(null);
  const attendeeChartInstance = useRef(null);
  const dashboardRef = useRef(null);

  // New Ref
  const attendeeChartRef = useRef(null);

  useEffect(() => {
    fetchAnalytics();
    fetchUserSession();
  }, []);

  useEffect(() => {
    if (analytics) {
      renderCharts();
    }

    // Cleanup charts on unmount
    return () => {
      if (statusChartInstance.current) statusChartInstance.current.destroy();
      if (typeChartInstance.current) typeChartInstance.current.destroy();
      if (feedbackChartInstance.current) feedbackChartInstance.current.destroy();
      if (trendsChartInstance.current) trendsChartInstance.current.destroy();
    };
  }, [analytics]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSession = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user session:', error);
    }
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      let yPosition = margin;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Helper function to add section header
      const addSectionHeader = (title, color = [99, 102, 241]) => {
        checkPageBreak(15);
        pdf.setFillColor(...color);
        pdf.rect(margin, yPosition, contentWidth, 8, 'F');
        pdf.setFontSize(12);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin + 3, yPosition + 5.5);
        yPosition += 12;
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
      };

      // ===== COVER PAGE =====
      pdf.setFillColor(99, 102, 241);
      pdf.rect(0, 0, pageWidth, 80, 'F');

      pdf.setFontSize(28);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EVENT ANALYTICS REPORT', pageWidth / 2, 35, { align: 'center' });

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('School Event Management System', pageWidth / 2, 45, { align: 'center' });

      const reportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      pdf.setFontSize(10);
      pdf.text(`Generated: ${reportDate}`, pageWidth / 2, 55, { align: 'center' });

      yPosition = 100;

      // ===== EXECUTIVE SUMMARY =====
      addSectionHeader('EXECUTIVE SUMMARY');

      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);

      const totalEvents = analytics.status_distribution.reduce((sum, s) => sum + s.count, 0);
      const completedEvents = analytics.status_distribution.find(s => s.status === 'Completed')?.count || 0;
      const completionRate = totalEvents > 0 ? ((completedEvents / totalEvents) * 100).toFixed(1) : 0;

      const summaryText = `This report provides a comprehensive analysis of ${totalEvents} events managed through the system. ` +
        `With a ${completionRate}% completion rate and an average feedback rating of ${analytics.feedback.avg_overall}/5, ` +
        `the event management system demonstrates strong operational performance. Total budget allocation stands at ` +
        `PHP ${(analytics.budget.total / 1000).toFixed(1)}K with an average attendance rate of ${analytics.attendance.attendance_rate}%.`;

      // Set font explicitly before rendering
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      // Use native splitTextToSize for reliable wrapping
      const summaryLines = pdf.splitTextToSize(summaryText, contentWidth);
      pdf.text(summaryLines, margin, yPosition);

      // Update Y position based on number of lines (approx 5mm per line)
      yPosition += (summaryLines.length * 5) + 10;

      // ===== KEY PERFORMANCE INDICATORS =====
      addSectionHeader('KEY PERFORMANCE INDICATORS', [16, 185, 129]);

      checkPageBreak(40);

      // KPI Cards
      const kpis = [
        { label: 'Total Events', value: String(totalEvents), icon: '●' },
        { label: 'Completion Rate', value: `${completionRate}%`, icon: '●' },
        { label: 'Avg Feedback', value: `${analytics.feedback.avg_overall}/5`, icon: '★' },
        { label: 'Attendance Rate', value: `${analytics.attendance.attendance_rate}%`, icon: '●' }
      ];

      const cardWidth = (contentWidth - 9) / 4;
      kpis.forEach((kpi, idx) => {
        const xPos = margin + (idx * (cardWidth + 3));
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(xPos, yPosition, cardWidth, 20, 2, 2, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(xPos, yPosition, cardWidth, 20, 2, 2, 'S');

        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(kpi.label, xPos + cardWidth / 2, yPosition + 6, { align: 'center' });

        pdf.setFontSize(14);
        pdf.setTextColor(30, 41, 59);
        pdf.setFont('helvetica', 'bold');
        pdf.text(kpi.value, xPos + cardWidth / 2, yPosition + 15, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
      });
      yPosition += 30;

      // ===== KEY INSIGHTS & FINDINGS =====
      addSectionHeader('KEY INSIGHTS & FINDINGS', [245, 158, 11]);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);

      // Generate insights based on data
      const insights = [];

      // Event Type Analysis
      const topEventType = analytics.type_distribution.reduce((max, t) => t.count > max.count ? t : max, analytics.type_distribution[0]);
      insights.push(`- ${topEventType.event_type} events are the most popular category with ${topEventType.count} events, indicating strong interest in this area.`);

      // Attendance Analysis
      if (analytics.attendance.attendance_rate >= 80) {
        insights.push(`- Excellent attendance rate of ${analytics.attendance.attendance_rate}% demonstrates high student engagement and effective event promotion.`);
      } else if (analytics.attendance.attendance_rate >= 60) {
        insights.push(`- Moderate attendance rate of ${analytics.attendance.attendance_rate}% suggests room for improvement in event marketing and student outreach.`);
      } else {
        insights.push(`- Low attendance rate of ${analytics.attendance.attendance_rate}% indicates a need for enhanced promotional strategies and timing optimization.`);
      }

      // Feedback Analysis
      if (analytics.feedback.avg_overall >= 4.0) {
        insights.push(`- High satisfaction rating of ${analytics.feedback.avg_overall}/5 reflects quality event execution and positive participant experiences.`);
      } else if (analytics.feedback.avg_overall >= 3.0) {
        insights.push(`- Average satisfaction rating of ${analytics.feedback.avg_overall}/5 indicates acceptable performance with opportunities for enhancement.`);
      } else {
        insights.push(`- Below-average satisfaction rating of ${analytics.feedback.avg_overall}/5 requires immediate attention to event quality and participant experience.`);
      }

      // Budget Analysis
      const avgBudget = analytics.budget.average;
      insights.push(`- Average event budget of PHP ${avgBudget.toFixed(0)} provides baseline for future planning and resource allocation.`);

      // Venue Analysis
      if (analytics.top_venues.length > 0) {
        const topVenue = analytics.top_venues[0];
        insights.push(`- ${topVenue.venue} is the most utilized venue with ${topVenue.usage_count} bookings, suggesting high demand and suitability for events.`);
      }

      insights.forEach(insight => {
        const insightLines = pdf.splitTextToSize(insight, contentWidth);
        const requiredSpace = (insightLines.length * 5) + 3;
        checkPageBreak(requiredSpace);

        pdf.text(insightLines, margin, yPosition);
        yPosition += requiredSpace;
      });

      yPosition += 5;

      // ===== TREND ANALYSIS =====
      checkPageBreak(60);
      addSectionHeader('TREND ANALYSIS', [139, 92, 246]);

      if (analytics.trends.monthly.length > 0) {
        const recentMonths = analytics.trends.monthly.slice(-3);
        const trend = recentMonths[recentMonths.length - 1].event_count > recentMonths[0].event_count ? 'increasing' : 'decreasing';

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);

        const trendText = `Event activity shows a ${trend} trend over the past quarter. ` +
          (trend === 'increasing'
            ? 'This positive momentum suggests growing engagement and successful event programming.'
            : 'Consider reviewing event scheduling and promotional strategies to boost participation.');

        const trendLines = pdf.splitTextToSize(trendText, contentWidth);
        pdf.text(trendLines, margin, yPosition);
        yPosition += (trendLines.length * 5) + 10;
      }

      // Add monthly trends chart
      if (trendsChartRef.current) {
        checkPageBreak(80);
        const canvas = await html2canvas(trendsChartRef.current.parentElement, {
          scale: 2,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, Math.min(imgHeight, 70));
        yPosition += Math.min(imgHeight, 70) + 10;
      }

      // Add Attendee Comparison chart
      if (attendeeChartRef.current) {
        checkPageBreak(80);
        addSectionHeader('ATTENDANCE ANALYSIS', [236, 72, 153]); // Pinkish header

        const canvas = await html2canvas(attendeeChartRef.current.parentElement, {
          scale: 2,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, Math.min(imgHeight, 80));
        yPosition += Math.min(imgHeight, 80) + 10;
      }

      // ===== DEPARTMENT BUDGET ANALYSIS =====
      checkPageBreak(80);
      addSectionHeader('DEPARTMENT BUDGET ANALYSIS', [79, 70, 229]);

      if (analytics.department_budget && analytics.department_budget.length > 0) {
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);

        // Table Headers
        const cols = {
          dept: { x: margin, w: 80, label: 'Department' },
          count: { x: margin + 85, w: 20, label: 'Events' },
          budget: { x: margin + 110, w: 35, label: 'Total Budget' },
          avg: { x: margin + 150, w: 35, label: 'Avg / Event' }
        };

        const tableY = yPosition;
        pdf.setFont('helvetica', 'bold');
        pdf.text(cols.dept.label, cols.dept.x, tableY);
        pdf.text(cols.count.label, cols.count.x, tableY);
        pdf.text(cols.budget.label, cols.budget.x, tableY);
        pdf.text(cols.avg.label, cols.avg.x, tableY);

        yPosition += 8;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);

        analytics.department_budget.forEach((dept, i) => {
          // Alternating row background
          if (i % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin - 2, yPosition - 5, contentWidth + 4, 8, 'F');
          }

          const deptName = dept.department.length > 35 ? dept.department.substring(0, 32) + '...' : dept.department;

          pdf.text(deptName, cols.dept.x, yPosition);
          pdf.text(String(dept.event_count), cols.count.x + 5, yPosition);
          pdf.text(`PHP ${(Number(dept.total_budget) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, cols.budget.x, yPosition);
          pdf.text(`PHP ${(Number(dept.avg_budget) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, cols.avg.x, yPosition);

          yPosition += 8;
        });

        // Add detailed summary insight
        yPosition += 5;
        const topSpender = analytics.department_budget[0];
        const totalBudget = analytics.department_budget.reduce((sum, d) => sum + Number(d.total_budget), 0);
        const topSpenderPct = totalBudget > 0 ? ((Number(topSpender.total_budget) / totalBudget) * 100).toFixed(1) : 0;

        // Find most active department
        const mostActive = analytics.department_budget.reduce((max, d) => d.event_count > max.event_count ? d : max, analytics.department_budget[0]);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);

        const insightText = `${topSpender.department} dominates resource allocation with ${topSpenderPct}% of the total budget (PHP ${Number(topSpender.total_budget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). ` +
          (topSpender.department === mostActive.department
            ? `It is also the most active department with ${mostActive.event_count} events, justifying the significant resource utilization.`
            : `However, ${mostActive.department} leads in activity volume with ${mostActive.event_count} events, suggesting highly efficient resource management.`);

        const insightLines = pdf.splitTextToSize(insightText, contentWidth);
        pdf.text(insightLines, margin, yPosition);
        yPosition += (insightLines.length * 5) + 5;
      }

      // ===== RECOMMENDATIONS =====
      checkPageBreak(80);
      addSectionHeader('STRATEGIC RECOMMENDATIONS', [239, 68, 68]);

      pdf.setFontSize(10);
      const recommendations = [];

      // Attendance-based recommendations
      if (analytics.attendance.attendance_rate < 70) {
        recommendations.push({
          title: 'Enhance Event Promotion',
          desc: 'Implement multi-channel marketing campaigns including social media, email, and campus posters to increase awareness and registration.'
        });
      }

      // Feedback-based recommendations
      if (analytics.feedback.avg_overall < 4.0) {
        recommendations.push({
          title: 'Improve Event Quality',
          desc: 'Conduct post-event surveys to identify specific areas for improvement. Focus on venue selection, activity planning, and organizational efficiency.'
        });
      }

      // Budget recommendations
      recommendations.push({
        title: 'Optimize Budget Allocation',
        desc: `With an average budget of PHP ${avgBudget.toFixed(0)}, consider reallocating resources to high-impact events and exploring cost-effective alternatives for supplies.`
      });

      // Venue recommendations
      if (analytics.top_venues.length > 0) {
        recommendations.push({
          title: 'Diversify Venue Usage',
          desc: 'While popular venues are valuable, explore underutilized spaces to reduce scheduling conflicts and provide varied event experiences.'
        });
      }

      // Upcoming events
      if (analytics.trends.upcoming_events > 0) {
        recommendations.push({
          title: 'Prepare for Upcoming Events',
          desc: `With ${analytics.trends.upcoming_events} approved events scheduled, ensure adequate resource allocation and staff coordination for successful execution.`
        });
      }

      recommendations.forEach((rec, idx) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 41, 59);

        // Title with potential wrapping
        const titleLines = pdf.splitTextToSize(`${idx + 1}. ${rec.title}`, contentWidth);

        // Calculate total space needed: Title lines + Description lines + gaps
        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(rec.desc, contentWidth - 5);

        const requiredSpace = (titleLines.length * 6) + (descLines.length * 5) + 5;
        checkPageBreak(requiredSpace);

        // Print Title
        pdf.setFont('helvetica', 'bold');
        pdf.text(titleLines, margin, yPosition);
        yPosition += (titleLines.length * 6);

        // Print Description
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);

        pdf.text(descLines, margin + 5, yPosition);
        yPosition += (descLines.length * 5) + 5;
      });

      // ===== APPENDIX: CHARTS REMOVED AS REQUESTED =====
      // The charts were removed to improve the professional look of the PDF report.
      // Detailed charts are available in the dashboard view.

      // Footer on last page
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('School Event Management System - Confidential', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Generate blob URL for preview
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfPreviewUrl(url);
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    const { jsPDF } = window.jspdf;
    const link = document.createElement('a');
    link.href = pdfPreviewUrl;
    link.download = `Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();
    setShowPreviewModal(false);
  };

  const closePreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
    setShowPreviewModal(false);
  };

  const renderCharts = () => {
    if (!analytics) return;

    // Destroy existing charts
    if (statusChartInstance.current) statusChartInstance.current.destroy();
    if (typeChartInstance.current) typeChartInstance.current.destroy();
    if (feedbackChartInstance.current) feedbackChartInstance.current.destroy();
    if (trendsChartInstance.current) trendsChartInstance.current.destroy();

    // 1. Status Distribution Pie Chart
    if (statusChartRef.current && analytics.status_distribution.length > 0) {
      const statusData = analytics.status_distribution;
      const statusColors = {
        'Pending': '#fbbf24',
        'Under Review': '#3b82f6',
        'Approved': '#10b981',
        'Ongoing': '#8b5cf6',
        'Completed': '#14b8a6',
        'Draft': '#6b7280',
        'Archived': '#9ca3af'
      };

      statusChartInstance.current = new Chart(statusChartRef.current, {
        type: 'doughnut',
        data: {
          labels: statusData.map(d => d.status),
          datasets: [{
            data: statusData.map(d => d.count),
            backgroundColor: statusData.map(d => statusColors[d.status] || '#6b7280'),
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { padding: 15, font: { size: 12 } }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((context.parsed / total) * 100).toFixed(1);
                  return `${context.label}: ${context.parsed} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }

    // 2. Event Type Distribution Bar Chart
    if (typeChartRef.current && analytics.type_distribution.length > 0) {
      const typeData = analytics.type_distribution;

      typeChartInstance.current = new Chart(typeChartRef.current, {
        type: 'bar',
        data: {
          labels: typeData.map(d => d.event_type),
          datasets: [{
            label: 'Number of Events',
            data: typeData.map(d => d.count),
            backgroundColor: '#6366f1',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }

    // 3. Feedback Ratings Radar Chart
    if (feedbackChartRef.current && analytics.feedback.total_feedback > 0) {
      feedbackChartInstance.current = new Chart(feedbackChartRef.current, {
        type: 'radar',
        data: {
          labels: ['Overall', 'Venue', 'Activities', 'Organization'],
          datasets: [{
            label: 'Average Rating',
            data: [
              analytics.feedback.avg_overall,
              analytics.feedback.avg_venue,
              analytics.feedback.avg_activities,
              analytics.feedback.avg_organization
            ],
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderColor: '#6366f1',
            borderWidth: 2,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#6366f1'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              max: 5,
              ticks: { stepSize: 1 }
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

    // 4. Monthly Trends Line Chart
    if (trendsChartRef.current && analytics.trends.monthly.length > 0) {
      const monthlyData = analytics.trends.monthly;

      trendsChartInstance.current = new Chart(trendsChartRef.current, {
        type: 'line',
        data: {
          labels: monthlyData.map(d => {
            const date = new Date(d.month + '-01');
            return date.toLocaleDateString('en', { month: 'short', year: 'numeric' });
          }),
          datasets: [{
            label: 'Actual Events',
            data: monthlyData.map(d => d.event_count),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }

    // 5. Expected vs Actual Attendees by Type (Bar Chart)
    if (attendeeChartRef.current && analytics.expected_attendees && analytics.expected_attendees.by_type) {
      if (attendeeChartInstance.current) attendeeChartInstance.current.destroy();

      const attData = analytics.expected_attendees.by_type;

      attendeeChartInstance.current = new Chart(attendeeChartRef.current, {
        type: 'bar',
        data: {
          labels: attData.map(d => d.event_type),
          datasets: [
            {
              label: 'Avg Initial Expected',
              data: attData.map(d => d.avg_expected),
              backgroundColor: '#ec4899', // Pink-500
              borderRadius: 4
            },
            {
              label: 'Avg Actual Present',
              data: attData.map(d => d.avg_actual || 0),
              backgroundColor: '#10b981', // Emerald-500
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            y: { beginAtZero: true, grid: { borderDash: [2, 2] } },
            x: { grid: { display: false } }
          }
        }
      });
    }
  };

  if (loading) {
    return React.createElement('div', { className: 'flex items-center justify-center h-96' },
      React.createElement('div', { className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600' })
    );
  }

  if (!analytics) {
    return React.createElement('div', { className: 'text-center text-gray-500 py-12' },
      'No analytics data available'
    );
  }

  return React.createElement('div', { className: 'space-y-6', ref: dashboardRef },
    // Preview Modal
    showPreviewModal && React.createElement('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4',
      onClick: closePreview
    },
      React.createElement('div', {
        className: 'bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col',
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('div', { className: 'flex items-center justify-between p-4 border-b' },
          React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, 'PDF Preview'),
          React.createElement('button', {
            onClick: closePreview,
            className: 'text-gray-400 hover:text-gray-600'
          },
            React.createElement('svg', { className: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' })
            )
          )
        ),
        React.createElement('div', { className: 'flex-1 overflow-hidden' },
          pdfPreviewUrl && React.createElement('iframe', {
            src: pdfPreviewUrl,
            className: 'w-full h-full border-0'
          })
        ),
        React.createElement('div', { className: 'flex items-center justify-end gap-3 p-4 border-t bg-gray-50' },
          React.createElement('button', {
            onClick: closePreview,
            className: 'px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition'
          }, 'Cancel'),
          React.createElement('button', {
            onClick: downloadPDF,
            className: 'px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2'
          },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' })
            ),
            'Download PDF'
          )
        )
      )
    ),

    // Header
    React.createElement('div', { className: 'flex justify-between items-center' },
      React.createElement('div', null,
        React.createElement('h1', { className: 'text-3xl font-bold text-gray-900' }, 'Analytics Dashboard'),
        React.createElement('p', { className: 'text-gray-500 mt-1' }, 'Comprehensive insights and metrics')
      ),
      React.createElement('div', { className: 'flex items-center gap-3' },
        user && user.role_name === 'Super Admin' && React.createElement('button', {
          onClick: generatePDF,
          disabled: isGenerating,
          className: `px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`
        },
          isGenerating ? React.createElement('div', { className: 'animate-spin rounded-full h-4 w-4 border-b-2 border-white' }) :
            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
            ),
          isGenerating ? 'Generating...' : 'Export to PDF'
        ),
        React.createElement('button', {
          onClick: fetchAnalytics,
          className: 'px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2'
        },
          React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' })
          ),
          'Refresh'
        )
      )
    ),

    // Key Metrics Cards
    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4' },
      React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', null,
            React.createElement('p', { className: 'text-sm font-medium text-slate-600 mb-1' }, 'Total Budget'),
            React.createElement('p', { className: 'text-2xl font-bold text-emerald-600' },
              `₱${(analytics.budget.total / 1000).toFixed(0)}K`
            )
          ),
          React.createElement('div', { className: 'w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-emerald-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
            )
          )
        ),
        React.createElement('p', { className: 'text-xs text-slate-500 mt-2' },
          `Avg: ₱${analytics.budget.average.toFixed(0)}`
        )
      ),

      React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', null,
            React.createElement('p', { className: 'text-sm font-medium text-slate-600 mb-1' }, 'Attendance Rate'),
            React.createElement('p', { className: 'text-2xl font-bold text-blue-600' },
              `${analytics.attendance.attendance_rate}%`
            )
          ),
          React.createElement('div', { className: 'w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-blue-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' })
            )
          )
        ),
        React.createElement('p', { className: 'text-xs text-slate-500 mt-2' },
          `${analytics.attendance.total_attendees}/${analytics.attendance.total_registrations} registered`
        )
      ),

      React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', null,
            React.createElement('p', { className: 'text-sm font-medium text-slate-600 mb-1' }, 'Avg Feedback'),
            React.createElement('p', { className: 'text-2xl font-bold text-amber-600' },
              `${analytics.feedback.avg_overall}/5`
            )
          ),
          React.createElement('div', { className: 'w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-amber-600', fill: 'currentColor', viewBox: '0 0 20 20' },
              React.createElement('path', { d: 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' })
            )
          )
        ),
        React.createElement('p', { className: 'text-xs text-slate-500 mt-2' },
          `${analytics.feedback.total_feedback} responses`
        )
      ),

      React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', null,
            React.createElement('p', { className: 'text-sm font-medium text-slate-600 mb-1' }, 'Upcoming Events'),
            React.createElement('p', { className: 'text-2xl font-bold text-purple-600' },
              analytics.trends.upcoming_events
            )
          ),
          React.createElement('div', { className: 'w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-purple-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })
            )
          )
        ),
        React.createElement('p', { className: 'text-xs text-slate-500 mt-2' }, 'Approved & scheduled')
      )
    ),

    // Charts Grid
    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
      // Status Distribution
      React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6 shadow-sm' },
        React.createElement('div', { className: 'flex items-center gap-3 mb-4' },
          React.createElement('div', { className: 'w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-slate-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' })
            )
          ),
          React.createElement('div', null,
            React.createElement('h3', { className: 'text-lg font-bold text-gray-900' }, 'Events by Status'),
            React.createElement('p', { className: 'text-xs text-gray-500' }, 'Distribution of event statuses')
          )
        ),
        React.createElement('div', { className: 'h-64' },
          React.createElement('canvas', { ref: statusChartRef })
        )
      ),

      // Event Type Distribution
      React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6 shadow-sm' },
        React.createElement('div', { className: 'flex items-center gap-3 mb-4' },
          React.createElement('div', { className: 'w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-slate-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' })
            )
          ),
          React.createElement('div', null,
            React.createElement('h3', { className: 'text-lg font-bold text-gray-900' }, 'Events by Type'),
            React.createElement('p', { className: 'text-xs text-gray-500' }, 'Category breakdown')
          )
        ),
        React.createElement('div', { className: 'h-64' },
          React.createElement('canvas', { ref: typeChartRef })
        )
      ),

      // Feedback Radar
      React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6 shadow-sm' },
        React.createElement('div', { className: 'flex items-center gap-3 mb-4' },
          React.createElement('div', { className: 'w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-amber-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' })
            )
          ),
          React.createElement('div', null,
            React.createElement('h3', { className: 'text-lg font-bold text-gray-900' }, 'Feedback Analysis'),
            React.createElement('p', { className: 'text-xs text-gray-500' }, 'Average ratings by category')
          )
        ),
        analytics.feedback.total_feedback > 0
          ? React.createElement('div', { className: 'h-64' },
            React.createElement('canvas', { ref: feedbackChartRef })
          )
          : React.createElement('div', { className: 'h-64 flex items-center justify-center text-gray-400' },
            'No feedback data yet'
          )
      ),

      // Monthly Trends (Half Width)
      React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6 shadow-sm' },
        React.createElement('div', { className: 'flex items-center gap-3 mb-4' },
          React.createElement('div', { className: 'w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-indigo-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' })
            )
          ),
          React.createElement('div', null,
            React.createElement('h3', { className: 'text-lg font-bold text-gray-900' }, 'Activity Trends'),
            React.createElement('p', { className: 'text-xs text-gray-500' }, 'Events over last 6 months')
          )
        ),
        React.createElement('div', { className: 'h-64' },
          React.createElement('canvas', { ref: trendsChartRef })
        )
      ),

      // NEW: Expected vs Actual Attendees Comparison (Full Width)
      analytics.expected_attendees && React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6 shadow-sm md:col-span-2' },
        React.createElement('div', { className: 'flex items-center justify-between mb-4' },
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('div', { className: 'w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center' },
              React.createElement('svg', { className: 'w-6 h-6 text-pink-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' })
              )
            ),
            React.createElement('div', null,
              React.createElement('h3', { className: 'text-lg font-bold text-gray-900' }, 'Attendance Comparison'),
              React.createElement('p', { className: 'text-xs text-gray-500' }, 'Expected vs Actual Attendees by Event Type')
            )
          ),
          React.createElement('div', { className: 'text-right' },
            React.createElement('span', { className: 'text-xs font-semibold text-gray-500 uppercase' }, 'Total Expected'),
            React.createElement('p', { className: 'text-2xl font-bold text-pink-600' }, analytics.expected_attendees.total.toLocaleString())
          )
        ),
        React.createElement('div', { className: 'h-64' },
          React.createElement('canvas', { ref: attendeeChartRef })
        )
      )
    ),

    // Recent Feedback Table
    analytics.feedback.per_event && analytics.feedback.per_event.length > 0 && React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
      React.createElement('h3', { className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Recent Event Feedback'),
      React.createElement('div', { className: 'overflow-x-auto' },
        React.createElement('table', { className: 'min-w-full' },
          React.createElement('thead', null,
            React.createElement('tr', { className: 'border-b border-gray-200' },
              React.createElement('th', { className: 'text-left py-3 px-4 text-sm font-semibold text-gray-700' }, 'Event'),
              React.createElement('th', { className: 'text-left py-3 px-4 text-sm font-semibold text-gray-700' }, 'Date'),
              React.createElement('th', { className: 'text-center py-3 px-4 text-sm font-semibold text-gray-700' }, 'Rating'),
              React.createElement('th', { className: 'text-right py-3 px-4 text-sm font-semibold text-gray-700' }, 'Responses')
            )
          ),
          React.createElement('tbody', null,
            analytics.feedback.per_event.map((event, idx) => {
              const ratingColor = event.avg_rating >= 4.5 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                event.avg_rating >= 4.0 ? 'text-blue-600 bg-blue-50 border-blue-200' :
                  event.avg_rating >= 3.0 ? 'text-amber-600 bg-amber-50 border-amber-200' :
                    'text-red-600 bg-red-50 border-red-200';

              const date = new Date(event.start_datetime);
              const formattedDate = date.toLocaleDateString();

              return React.createElement('tr', { key: idx, className: 'border-b border-gray-100 hover:bg-gray-50' },
                React.createElement('td', { className: 'py-3 px-4 text-sm font-medium text-gray-900' }, event.name),
                React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-500' }, formattedDate),
                React.createElement('td', { className: 'py-3 px-4 text-center' },
                  React.createElement('span', { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ratingColor}` },
                    event.avg_rating.toFixed(1),
                    React.createElement('svg', { className: 'w-3 h-3 ml-1', fill: 'currentColor', viewBox: '0 0 20 20' },
                      React.createElement('path', { d: 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' })
                    )
                  )
                ),
                React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700 text-right' }, event.response_count)
              );
            })
          )
        )
      )
    ),

    // Top Venues Table
    analytics.top_venues.length > 0 && React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6 shadow-sm' },
      React.createElement('div', { className: 'flex items-center gap-3 mb-5' },
        React.createElement('div', { className: 'w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center' },
          React.createElement('svg', { className: 'w-6 h-6 text-slate-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' })
          )
        ),
        React.createElement('div', null,
          React.createElement('h3', { className: 'text-lg font-bold text-gray-900' }, 'Top 5 Venues'),
          React.createElement('p', { className: 'text-xs text-gray-500' }, 'Most frequently booked locations')
        )
      ),
      React.createElement('div', { className: 'overflow-x-auto' },
        React.createElement('table', { className: 'min-w-full' },
          React.createElement('thead', null,
            React.createElement('tr', { className: 'border-b border-gray-200' },
              React.createElement('th', { className: 'text-left py-3 px-4 text-sm font-semibold text-gray-700' }, 'Venue'),
              React.createElement('th', { className: 'text-right py-3 px-4 text-sm font-semibold text-gray-700' }, 'Usage Count'),
              React.createElement('th', { className: 'text-right py-3 px-4 text-sm font-semibold text-gray-700' }, 'Popularity')
            )
          ),
          React.createElement('tbody', null,
            analytics.top_venues.map((venue, idx) => {
              const maxCount = analytics.top_venues[0].usage_count;
              const percentage = (venue.usage_count / maxCount * 100).toFixed(0);
              return React.createElement('tr', { key: idx, className: 'border-b border-gray-100 hover:bg-gray-50' },
                React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-900' }, venue.venue),
                React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700 text-right' }, venue.usage_count),
                React.createElement('td', { className: 'py-3 px-4 text-right' },
                  React.createElement('div', { className: 'flex items-center justify-end gap-2' },
                    React.createElement('div', { className: 'w-24 bg-gray-200 rounded-full h-2' },
                      React.createElement('div', {
                        className: 'bg-indigo-600 h-2 rounded-full',
                        style: { width: `${percentage}%` }
                      })
                    ),
                    React.createElement('span', { className: 'text-xs text-gray-600' }, `${percentage}%`)
                  )
                )
              );
            })
          )
        )
      )
    ),

    // 2-column grid for Department Budget and Attendance
    React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' },
      React.createElement(window.DepartmentBudgetTable, { data: analytics.department_budget }),
      React.createElement(window.AttendanceByTypeChart, { data: analytics.attendance_by_type })
    ),

    React.createElement(window.LowRatedEventsAlert, { data: analytics.low_rated_events })
  );
};
