/* app.jsx — assembled landing page */

function App() {
  return (
    <I18nProvider>
      <div className="bg-texture"></div>
      <div className="grain"></div>
      <Nav />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <WhatsAppSection />
      <Privacy />
      <FinalCTA />
      <Footer />
    </I18nProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
