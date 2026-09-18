import logging
import torch
from gliner import GLiNER

logger = logging.getLogger("gliner_service")

class GlinerModelContainer:
    """
    Singleton wrapper to manage the lifecycle and inference of the GLiNER model.
    Ensures the model weights are kept warm in memory.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(GlinerModelContainer, cls).__new__(cls, *args, **kwargs)
            cls._instance.model = None
            # Automatically target the GPU if CUDA is available, otherwise fallback to CPU
            cls._instance.device = "cuda" if torch.cuda.is_available() else "cpu"
        return cls._instance

    def load_model(self, model_name: str = "gliner-community/gliner_small-v2.5"):
        """Loads the GLiNER weights from disk cache into memory."""
        if self.model is None:
            logger.info(f"Loading GLiNER model '{model_name}' onto device: {self.device}...")
            try:
                self.model = GLiNER.from_pretrained(model_name)
                self.model.to(self.device)
                logger.info("GLiNER model loaded successfully and ready for inference.")
            except Exception as e:
                logger.critical(f"Failed to load GLiNER model: {str(e)}")
                raise e
        else:
            logger.debug("Model already warm in memory. Skipping load sequence.")

    def predict(self, text: str, labels: list[str], threshold: float) -> list[dict]:
        """Runs zero-shot span extraction against raw OCR text."""
        if self.model is None:
            raise RuntimeError("Model has not been initialized. Call load_model() first.")
        
        # We explicitly set flat_ner=False to capture overlapping target spans
        # This gives your downstream deterministic code maximum context to parse fields.
        raw_predictions = self.model.predict_entities(
            text, 
            labels, 
            flat_ner=False, 
            threshold=threshold
        )
        return raw_predictions

# Instantiate the global accessor instance
gliner_container = GlinerModelContainer()
